# 番迹 AWS Terraform + Auto Scaling 部署指南

这套 Terraform 会创建一份比手点 Console 更可重复的部署：

- Application Load Balancer：公网入口，健康检查 `/api/health`
- Auto Scaling Group：按 CPU 自动扩/缩 EC2
- Launch Template：启动 Amazon Linux 2023、Node.js 22，并部署番迹
- EFS：把 SQLite 数据库放到共享文件系统，避免 ASG 换机器后数据丢失
- Security Groups：公网只进 ALB，实例只接收 ALB 流量；SSH 只允许你指定的 IP

> 这版是“少改代码、先扩起来”的方案。SQLite + EFS 适合轻量多人和低频写入；如果以后注册用户多、同时写入明显增加，下一步应把数据库迁到 RDS PostgreSQL。

## 0. 前提

本机需要：

- Terraform 1.6+
- AWS CLI，且已经 `aws configure` 到你的账户
- 你的 EC2 key pair。你说的私钥是 `619_2.pem`，AWS 里的 key pair 名通常就是 `619_2`
- 代码已经 push 到 GitHub，因为新 EC2 会在启动时 `git clone`
- 当前 Terraform 默认使用 AWS default VPC。大多数账号都有；如果你删过 default VPC，需要先恢复，或后续把这套配置改成自建 VPC。

确认 AWS 登录：

```bash
aws sts get-caller-identity
```

确认私钥权限：

```bash
chmod 400 /path/to/619_2.pem
```

如果 AWS 里还没有名为 `619_2` 的 EC2 key pair，可以从私钥导出公钥：

```bash
ssh-keygen -y -f /path/to/619_2.pem > 619_2.pub
```

然后在 `terraform.tfvars` 里设置：

```hcl
create_key_pair = true
public_key_path = "/absolute/path/to/619_2.pub"
key_name        = "619_2"
```

## 1. 配置变量

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

编辑 `terraform.tfvars`，至少确认这些：

```hcl
aws_region  = "us-east-1"
app_repo_url = "https://github.com/yutengzhang03/fanji.git"
app_git_ref  = "main"
key_name     = "619_2"
```

建议只允许你自己的 IP SSH：

```bash
curl https://checkip.amazonaws.com
```

把输出填进去：

```hcl
ssh_cidr_blocks = ["你的公网IP/32"]
```

建议设置固定登录 token 密钥：

```bash
openssl rand -hex 32
```

填入：

```hcl
fanji_token_secret = "上一步生成的64位hex字符串"
```

默认使用 `t4g.micro` + ARM64。想更省可以改 `t4g.nano`；如果你要用 `t3.micro`，必须一起改架构：

```hcl
instance_type         = "t3.micro"
instance_architecture = "x86_64"
```

## 2. 创建基础设施

```bash
terraform init
terraform plan
terraform apply
```

完成后 Terraform 会输出：

- `app_url`：访问番迹的公网地址
- `autoscaling_group_name`：ASG 名字
- `find_instance_public_ips_command`：找实例公网 IP 的命令

第一次启动通常要等 5-10 分钟，因为 EC2 会安装 Node.js、拉代码、安装依赖、构建前端。

## 3. 检查部署

访问：

```bash
terraform output -raw app_url
```

健康检查：

```bash
curl "$(terraform output -raw app_url)/api/health"
```

如果打不开，先找实例 IP：

```bash
$(terraform output -raw find_instance_public_ips_command)
```

SSH 上去看启动日志：

```bash
ssh -i /path/to/619_2.pem ec2-user@实例公网IP
sudo tail -n 200 /var/log/fanji-bootstrap.log
sudo journalctl -u fanji -n 200 --no-pager
```

## 4. 迁移旧 SQLite 数据

如果你现在旧 EC2 上已经有 `server/data/fanji.db`，需要迁到 EFS。

先把 ASG 暂时保持 1 台：

```hcl
asg_min_size         = 1
asg_desired_capacity = 1
asg_max_size         = 1
```

应用：

```bash
terraform apply
```

找到新实例 IP：

```bash
$(terraform output -raw find_instance_public_ips_command)
```

上传旧数据库：

```bash
scp -i /path/to/619_2.pem /path/to/fanji.db ec2-user@实例公网IP:/tmp/fanji.db
```

SSH 到新实例执行：

```bash
sudo systemctl stop fanji
sudo cp /tmp/fanji.db /mnt/fanji-data/fanji.db
sudo chown ec2-user:ec2-user /mnt/fanji-data/fanji.db
sudo systemctl start fanji
```

确认没问题后，再把 `asg_max_size` 改回 3 或更高。

## 5. 扩缩容怎么用

默认：

```hcl
asg_min_size         = 1
asg_desired_capacity = 1
asg_max_size         = 3
cpu_target_value     = 55
```

含义：

- 平时至少 1 台
- 初始运行 1 台
- CPU 压力上来最多扩到 3 台
- 平均 CPU 目标约 55%

旺季可以提高上限：

```hcl
asg_max_size = 5
```

淡季可以降回：

```hcl
asg_max_size = 2
```

每次改完：

```bash
terraform apply
```

## 6. 更新应用代码

把代码 push 到 `main` 后，修改 `terraform.tfvars`：

```hcl
deployment_version = "2026-05-04-1"
```

然后：

```bash
terraform apply
```

Terraform 会更新 Launch Template，Auto Scaling Group 会滚动替换实例。新实例启动时会重新拉最新代码并构建。

你也可以直接部署某个 tag 或 commit：

```hcl
app_git_ref = "v0.3.0"
```

## 7. 可选 HTTPS

如果你有域名，先在同一个 region 创建 ACM 证书，并完成 DNS 验证。然后把证书 ARN 填进：

```hcl
domain_name     = "fanji.example.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
```

再：

```bash
terraform apply
```

Terraform 会创建 443 listener，并把 80 自动重定向到 443。

最后在 DNS 里把 `domain_name` 指到 `terraform output -raw alb_dns_name`。Route 53 可以用 ALIAS；其他 DNS 服务通常用 CNAME。

## 8. 删除全部资源

不想继续付费时：

```bash
terraform destroy
```

注意：这会删除 ALB、ASG、EC2、EFS，包括 EFS 里的 `fanji.db`。删除前请先备份：

```bash
scp -i /path/to/619_2.pem ec2-user@实例公网IP:/mnt/fanji-data/fanji.db ./fanji-backup.db
```

## 9. 费用提醒

这套方案比单台 EC2 贵，主要贵在 ALB 和 EFS，而不是小 EC2 本身。优点是流量入口、健康检查、自动替换坏实例、自动扩容都正规很多。想进一步省钱，可以先把 `asg_desired_capacity = 1`、`asg_max_size = 2`，等真的有访问量再调高。
