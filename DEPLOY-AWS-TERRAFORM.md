# AWS Terraform + Auto Scaling Deployment

[Back to README](./README.md) | [简体中文 README](./README.zh-CN.md)

This guide deploys animeTrace to AWS with Terraform. It creates repeatable infrastructure instead of relying on Console click-through setup.

## Architecture

Terraform creates:

- Application Load Balancer as the public HTTP/HTTPS entry point
- Auto Scaling Group for EC2 app instances
- CloudWatch CPU alarms:
  - high average CPU adds instances
  - low average CPU removes instances
- Launch Template that installs Amazon Linux 2023, Node.js 22, and animeTrace
- EFS shared storage for the SQLite database
- Security groups:
  - public traffic reaches only the ALB
  - app instances accept app traffic only from the ALB
  - SSH is allowed only from the CIDR blocks you configure

> SQLite on EFS is a practical low-change path for light multi-user traffic. If the app grows into frequent concurrent writes, migrate the database to RDS PostgreSQL.

## Prerequisites

Install locally:

- Terraform 1.6+
- AWS CLI
- Git

Configure AWS credentials:

```bash
aws configure
aws sts get-caller-identity
```

Make sure your code is pushed to GitHub, because every new EC2 instance clones the repository during boot.

This Terraform currently uses the AWS default VPC. Most accounts have one. If you deleted yours, recreate a default VPC or adapt the Terraform to create a dedicated VPC.

## SSH Key

If your private key file is named `619_2.pem`, the EC2 key pair in AWS is usually named `619_2`.

Set local permissions:

```bash
chmod 400 /path/to/619_2.pem
```

If the key pair does not exist in AWS yet, create a public key from your `.pem`:

```bash
ssh-keygen -y -f /path/to/619_2.pem > /path/to/619_2.pub
```

Then set these in `terraform.tfvars`:

```hcl
create_key_pair = true
public_key_path = "/path/to/619_2.pub"
key_name        = "619_2"
```

## Configure Terraform

Create your local settings file:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit only `terraform.tfvars` for normal changes. Terraform loads it automatically, and this repo ignores it so secrets and local settings are not committed.

At minimum, check:

```hcl
aws_region   = "us-east-1"
app_repo_url = "https://github.com/yutengzhang03/animeTrace.git"
app_git_ref  = "main"
key_name     = "619_2"
```

Allow SSH only from your current public IP:

```bash
curl https://checkip.amazonaws.com
```

Then:

```hcl
ssh_cidr_blocks = ["YOUR_PUBLIC_IP/32"]
```

Set a stable app token secret:

```bash
openssl rand -hex 32
```

Then:

```hcl
animetrace_token_secret = "the-64-character-hex-value"
```

## Choose Instance Size

Common low-cost choices are documented directly in [terraform.tfvars.example](./infra/terraform/terraform.tfvars.example).

For ARM/Graviton instances:

```hcl
instance_type         = "t4g.micro"
instance_architecture = "arm64"
```

For x86 instances:

```hcl
instance_type         = "t3.micro"
instance_architecture = "x86_64"
```

## CPU-Based Auto Scaling

The scaling knobs are all in `terraform.tfvars`:

```hcl
asg_min_size         = 1
asg_desired_capacity = 1
asg_max_size         = 3

cpu_scale_out_threshold = 70
cpu_scale_in_threshold  = 25

cpu_alarm_period_seconds    = 300
cpu_alarm_evaluation_periods = 2

scale_out_adjustment = 1
scale_in_adjustment  = 1
scaling_cooldown_seconds = 300
```

With these defaults:

- keep at least 1 instance running
- start with 1 instance
- scale up to at most 3 instances
- add 1 instance when average ASG CPU is at least 70% for 10 minutes
- remove 1 instance when average ASG CPU is at most 25% for 10 minutes
- wait 5 minutes after a scaling action before another simple scaling action

By default, EC2 basic monitoring provides most metrics, including CPU, at 5-minute resolution. For faster 1-minute scaling, set:

```hcl
enable_detailed_monitoring = true
cpu_alarm_period_seconds   = 60
```

Detailed monitoring can add CloudWatch cost.

For a busier season, raise:

```hcl
asg_max_size = 5
```

For a quiet season, lower:

```hcl
asg_max_size = 2
```

Apply changes:

```bash
terraform apply
```

## Deploy

Initialize Terraform:

```bash
terraform init
```

Review the plan:

```bash
terraform plan
```

Create the infrastructure:

```bash
terraform apply
```

The first launch usually takes 5-10 minutes because EC2 installs packages, clones the repo, installs dependencies, builds the frontend, and starts the service.

Terraform outputs:

- `app_url`: public app URL
- `alb_dns_name`: ALB DNS name
- `autoscaling_group_name`: ASG name
- `find_instance_public_ips_command`: helper command for SSH/debugging

Open:

```bash
terraform output -raw app_url
```

Health check:

```bash
curl "$(terraform output -raw app_url)/api/health"
```

## Debug a Failed Boot

Find the instance IP:

```bash
$(terraform output -raw find_instance_public_ips_command)
```

SSH in:

```bash
ssh -i /path/to/619_2.pem ec2-user@INSTANCE_PUBLIC_IP
```

Check logs:

```bash
sudo tail -n 200 /var/log/animetrace-bootstrap.log
sudo journalctl -u animetrace -n 200 --no-pager
```

## Migrate Existing SQLite Data

If your old EC2 instance already has `server/data/animeTrace.db`, copy it into EFS.

Temporarily keep the ASG at one instance:

```hcl
asg_min_size         = 1
asg_desired_capacity = 1
asg_max_size         = 1
```

Apply:

```bash
terraform apply
```

Find the new instance IP:

```bash
$(terraform output -raw find_instance_public_ips_command)
```

Upload the old database:

```bash
scp -i /path/to/619_2.pem /path/to/animeTrace.db ec2-user@INSTANCE_PUBLIC_IP:/tmp/animeTrace.db
```

SSH in and move it into EFS:

```bash
sudo systemctl stop animetrace
sudo cp /tmp/animeTrace.db /mnt/animeTrace-data/animeTrace.db
sudo chown ec2-user:ec2-user /mnt/animeTrace-data/animeTrace.db
sudo systemctl start animetrace
```

After confirming the app works, restore your desired `asg_max_size`.

## Deploy App Updates

Push code to the branch configured by `app_git_ref`, then bump:

```hcl
deployment_version = "2026-05-04-1"
```

Apply:

```bash
terraform apply
```

Terraform updates the Launch Template, and the Auto Scaling Group performs a rolling instance refresh. New instances clone and build the latest code.

You can also deploy a tag or commit:

```hcl
app_git_ref = "v0.3.0"
```

## Optional HTTPS

Create or import an ACM certificate in the same region, validate it, then set:

```hcl
domain_name     = "animetrace.example.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
```

Apply:

```bash
terraform apply
```

Terraform creates a 443 listener and redirects port 80 to 443.

Finally, point `domain_name` to:

```bash
terraform output -raw alb_dns_name
```

Use a Route 53 ALIAS record or a CNAME record from another DNS provider.

## Destroy

To remove all AWS resources:

```bash
terraform destroy
```

This deletes the ALB, ASG, EC2 instances, EFS, and the SQLite database on EFS. Back up first if you need the data:

```bash
scp -i /path/to/619_2.pem ec2-user@INSTANCE_PUBLIC_IP:/mnt/animeTrace-data/animeTrace.db ./animeTrace-backup.db
```

## Cost Notes

This architecture costs more than one tiny EC2 instance because ALB and EFS add baseline monthly cost. The tradeoff is a production-style entry point, health checks, instance replacement, and CPU-based scaling.

Keep the starting configuration small:

```hcl
asg_desired_capacity = 1
asg_max_size         = 2
```

Raise capacity when traffic justifies it.
