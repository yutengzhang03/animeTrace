# 番迹 — AWS EC2 部署指南

## 推荐实例

| 实例类型 | 架构 | 月费（约） | 说明 |
|---------|------|-----------|------|
| **t4g.nano** | ARM (Graviton) | ~$3/月 | 最便宜，2 vCPU / 0.5GB RAM，够用 |
| t4g.micro | ARM | ~$6/月 | 2 vCPU / 1GB RAM，更宽裕 |
| t3.micro | x86 | 免费层12个月 | 新账号首选，之后 ~$7/月 |

> 番迹是轻量 Node + SQLite 应用，`t4g.nano` 完全够用。如果你的 AWS 账号还在免费层期间，选 `t3.micro`。

## 一、创建 EC2 实例

1. 登录 AWS Console → EC2 → Launch Instance
2. 设置：
   - **Name**: `fanji`
   - **AMI**: Amazon Linux 2023（或 Ubuntu 24.04）
   - **Instance type**: `t4g.nano`（或 `t3.micro` 免费层）
   - **Key pair**: 创建或选一个已有的（用于 SSH）
   - **Security group**: 开放以下端口：
     - SSH (22) — 你的 IP
     - HTTP (80) — 0.0.0.0/0
     - HTTPS (443) — 0.0.0.0/0（如果要配证书）
   - **Storage**: 8GB gp3（默认即可）
3. 点 Launch

## 二、连接服务器并安装环境

```bash
# SSH 连接（替换你的密钥和公网 IP）
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Amazon Linux 2023
sudo dnf update -y
sudo dnf install -y git

# 安装 Node.js 22（使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
node -v  # 确认 v22.x
```

## 三、部署代码

```bash
# 方法一：Git clone（推荐）
cd ~
git clone YOUR_REPO_URL fanji
cd fanji

# 方法二：本地上传
# 在本地打包后 scp 上传：
# scp -i your-key.pem fanji.tar.gz ec2-user@YOUR_EC2_IP:~/
# ssh 到服务器后解压：
# tar xzf fanji.tar.gz && cd fanji

# 安装依赖
npm run install:all

# 构建前端
npm run build
```

## 四、迁移数据（首次部署）

```bash
# 把你本地的 fanji.db 上传到服务器（如果有旧数据）
# 在本地执行：
# scp -i your-key.pem server/data/fanji.db ec2-user@YOUR_EC2_IP:~/fanji/server/data/

# 在服务器上运行迁移脚本（创建 yutengz 账户并迁移旧数据）
cd ~/fanji/server
npm run migrate
```

## 五、用 systemd 管理进程

```bash
# 创建 systemd 服务
sudo tee /etc/systemd/system/fanji.service > /dev/null << 'EOF'
[Unit]
Description=番迹 Anime Tracker
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/fanji/server
ExecStart=/home/ec2-user/.nvm/versions/node/v22.*/bin/node --experimental-sqlite --no-warnings=ExperimentalWarning src/app.js
Restart=on-failure
RestartSec=5
Environment=PORT=3001
Environment=HOST=127.0.0.1
Environment=FANJI_TOKEN_SECRET=d4f1962883513c67b2bc01797640f8aa4981fb9cb9e470f025ad6e6213da24f1
# 生成随机密钥：openssl rand -hex 32

[Install]
WantedBy=multi-user.target
EOF

# 修正 node 路径（systemd 不走 nvm）
NODE_PATH=$(which node)
sudo sed -i "s|/home/ec2-user/.nvm/versions/node/v22.*/bin/node|$NODE_PATH|" /etc/systemd/system/fanji.service

# 启动
sudo systemctl daemon-reload
sudo systemctl enable fanji
sudo systemctl start fanji

# 查看状态
sudo systemctl status fanji
# 查看日志
journalctl -u fanji -f
```

## 六、用 Nginx 反向代理（推荐）

```bash
# 安装 Nginx
sudo dnf install -y nginx   # Amazon Linux
# sudo apt install -y nginx  # Ubuntu

# 配置
sudo tee /etc/nginx/conf.d/fanji.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # 替换成你的域名，没域名就用 _

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 启动 Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

现在访问 `http://YOUR_EC2_IP` 就能用了。

## 七、可选：配 HTTPS（Let's Encrypt）

如果你有域名，可以免费配 HTTPS：

```bash
# 安装 certbot
sudo dnf install -y certbot python3-certbot-nginx  # Amazon Linux
# sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# 申请证书（替换域名）
sudo certbot --nginx -d your-domain.com

# 自动续期已由 certbot 配好
```

## 八、更新部署

```bash
cd ~/fanji
git pull
npm run install:all
npm run build
sudo systemctl restart fanji
```

## 费用估算

| 项目 | 月费 |
|------|------|
| t4g.nano 实例 | ~$3.00 |
| 8GB EBS (gp3) | ~$0.64 |
| 数据传输（少量） | ~$0.50 |
| **合计** | **~$4-5/月** |

> 如果用 `t3.micro` 且在免费层期间，前 12 个月只需 ~$1/月（存储+流量）。

## 省钱技巧

- 用 **Savings Plan** 或 **Reserved Instance** 可以再省 30-40%
- 用 **Spot Instance** 可以省 60-70%（但可能被中断，适合不怕重启的场景）
- 考虑 **Lightsail**：$3.5/月固定价，包含流量，更简单（不需要配 VPC/安全组）
