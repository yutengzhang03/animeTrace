variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short project name used in resource names and tags."
  type        = string
  default     = "fanji"
}

variable "environment" {
  description = "Environment name used in resource names and tags."
  type        = string
  default     = "prod"
}

variable "app_repo_url" {
  description = "Git repository URL that each EC2 instance clones at boot."
  type        = string
  default     = "https://github.com/yutengzhang03/fanji.git"
}

variable "app_git_ref" {
  description = "Branch, tag, or commit SHA to deploy."
  type        = string
  default     = "main"
}

variable "deployment_version" {
  description = "Bump this value to force an Auto Scaling rolling instance refresh after pushing new app code."
  type        = string
  default     = "v1"
}

variable "app_port" {
  description = "Port used by the Node.js app on EC2 instances."
  type        = number
  default     = 3001
}

variable "key_name" {
  description = "EC2 key pair name. If your private key is 619_2.pem, the AWS key pair is commonly named 619_2."
  type        = string
  default     = "619_2"
}

variable "create_key_pair" {
  description = "Set true only when the EC2 key pair does not already exist in AWS and public_key_path points to a .pub file."
  type        = bool
  default     = false
}

variable "public_key_path" {
  description = "Local public key path used when create_key_pair is true."
  type        = string
  default     = ""
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed to SSH into app instances. Use your public IP with /32, or leave empty to disable SSH."
  type        = list(string)
  default     = []
}

variable "instance_type" {
  description = "EC2 instance type for app servers."
  type        = string
  default     = "t4g.micro"
}

variable "instance_architecture" {
  description = "AMI architecture. Use arm64 for t4g/t3g/t4g-style Graviton instances; use x86_64 for t3/t2."
  type        = string
  default     = "arm64"

  validation {
    condition     = contains(["arm64", "x86_64"], var.instance_architecture)
    error_message = "instance_architecture must be arm64 or x86_64."
  }
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB."
  type        = number
  default     = 12
}

variable "asg_min_size" {
  description = "Minimum number of app instances."
  type        = number
  default     = 1
}

variable "asg_desired_capacity" {
  description = "Desired number of app instances."
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum number of app instances."
  type        = number
  default     = 3
}

variable "cpu_target_value" {
  description = "Target average CPU percentage for Auto Scaling target tracking."
  type        = number
  default     = 55
}

variable "health_check_grace_period" {
  description = "Seconds Auto Scaling waits before trusting ELB health checks for a new instance."
  type        = number
  default     = 300
}

variable "fanji_token_secret" {
  description = "Stable HMAC secret for login tokens. Leave null to let Terraform generate one and store it in state."
  type        = string
  default     = null
  sensitive   = true
  nullable    = true
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN for HTTPS on the ALB. Leave empty for HTTP only."
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Optional domain name pointed at the ALB. Used only for the app_url output."
  type        = string
  default     = ""
}
