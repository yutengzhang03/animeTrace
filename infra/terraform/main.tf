data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "default" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-${var.instance_architecture}"]
  }

  filter {
    name   = "architecture"
    values = [var.instance_architecture]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "random_password" "fanji_token_secret" {
  length  = 64
  special = false
}

locals {
  name_prefix             = substr("${var.project_name}-${var.environment}", 0, 20)
  configured_token_secret = var.fanji_token_secret == null ? "" : trimspace(var.fanji_token_secret)
  fanji_token_secret      = local.configured_token_secret != "" ? local.configured_token_secret : random_password.fanji_token_secret.result

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  subnet_ids_by_az = {
    for subnet in data.aws_subnet.default : subnet.availability_zone => subnet.id...
  }

  efs_mount_target_subnet_ids = [
    for _, subnet_ids in local.subnet_ids_by_az : sort(subnet_ids)[0]
  ]
}

resource "aws_key_pair" "ssh" {
  count      = var.create_key_pair ? 1 : 0
  key_name   = var.key_name
  public_key = file(var.public_key_path)

  tags = merge(local.common_tags, {
    Name = var.key_name
  })
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Public HTTP/HTTPS access to Fanji ALB"
  vpc_id      = data.aws_vpc.default.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  count             = var.certificate_arn == "" ? 0 : 1
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app-sg"
  description = "Fanji app instances"
  vpc_id      = data.aws_vpc.default.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = var.app_port
  ip_protocol                  = "tcp"
  to_port                      = var.app_port
}

resource "aws_vpc_security_group_ingress_rule" "app_ssh" {
  for_each          = toset(var.ssh_cidr_blocks)
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = each.value
  from_port         = 22
  ip_protocol       = "tcp"
  to_port           = 22
}

resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "efs" {
  name        = "${local.name_prefix}-efs-sg"
  description = "Fanji shared SQLite storage on EFS"
  vpc_id      = data.aws_vpc.default.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-efs-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "efs_from_app" {
  security_group_id            = aws_security_group.efs.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 2049
  ip_protocol                  = "tcp"
  to_port                      = 2049
}

resource "aws_vpc_security_group_egress_rule" "efs_all" {
  security_group_id = aws_security_group.efs.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_efs_file_system" "data" {
  encrypted = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-data"
  })
}

resource "aws_efs_mount_target" "data" {
  for_each       = toset(local.efs_mount_target_subnet_ids)
  file_system_id = aws_efs_file_system.data.id
  subnet_id      = each.value
  security_groups = [
    aws_security_group.efs.id,
  ]
}

resource "aws_lb" "app" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids
  idle_timeout       = 60

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

resource "aws_lb_target_group" "app" {
  name                 = "${local.name_prefix}-tg"
  port                 = var.app_port
  protocol             = "HTTP"
  target_type          = "instance"
  vpc_id               = data.aws_vpc.default.id
  deregistration_delay = 30

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-tg"
  })
}

resource "aws_lb_listener" "http_forward" {
  count             = var.certificate_arn == "" ? 1 : 0
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count             = var.certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = var.certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_launch_template" "app" {
  name_prefix            = "${local.name_prefix}-app-"
  image_id               = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = var.create_key_pair ? aws_key_pair.ssh[0].key_name : var.key_name
  update_default_version = true

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      delete_on_termination = true
      encrypted             = true
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
    }
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.app.id]
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    app_git_ref        = var.app_git_ref
    app_port           = var.app_port
    app_repo_url       = var.app_repo_url
    deployment_version = var.deployment_version
    efs_file_system_id = aws_efs_file_system.data.id
    fanji_token_secret = local.fanji_token_secret
  }))

  tag_specifications {
    resource_type = "instance"

    tags = merge(local.common_tags, {
      Name              = "${local.name_prefix}-app"
      DeploymentVersion = var.deployment_version
    })
  }

  tag_specifications {
    resource_type = "volume"

    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-app-root"
    })
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-template"
  })
}

resource "aws_autoscaling_group" "app" {
  name                      = "${local.name_prefix}-asg"
  default_instance_warmup   = var.health_check_grace_period
  min_size                  = var.asg_min_size
  max_size                  = var.asg_max_size
  desired_capacity          = var.asg_desired_capacity
  health_check_grace_period = var.health_check_grace_period
  health_check_type         = "ELB"
  target_group_arns         = [aws_lb_target_group.app.arn]
  vpc_zone_identifier       = data.aws_subnets.default.ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"

    preferences {
      max_healthy_percentage = 200
      instance_warmup        = var.health_check_grace_period
      min_healthy_percentage = 100
    }

    triggers = ["launch_template"]
  }

  tag {
    key                 = "Name"
    value               = "${local.name_prefix}-app"
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = var.project_name
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "terraform"
    propagate_at_launch = true
  }

  depends_on = [
    aws_efs_mount_target.data,
    aws_lb_listener.http_forward,
    aws_lb_listener.http_redirect,
    aws_lb_listener.https,
  ]
}

resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "${local.name_prefix}-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    target_value = var.cpu_target_value

    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
  }
}
