output "app_url" {
  description = "Public URL for Fanji."
  value = var.domain_name != "" ? (
    var.certificate_arn == "" ? "http://${var.domain_name}" : "https://${var.domain_name}"
    ) : (
    var.certificate_arn == "" ? "http://${aws_lb.app.dns_name}" : "https://${aws_lb.app.dns_name}"
  )
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "autoscaling_group_name" {
  description = "Auto Scaling group name."
  value       = aws_autoscaling_group.app.name
}

output "efs_file_system_id" {
  description = "EFS file system that stores the shared SQLite database."
  value       = aws_efs_file_system.data.id
}

output "target_group_arn" {
  description = "ALB target group ARN, useful for checking target health."
  value       = aws_lb_target_group.app.arn
}

output "find_instance_public_ips_command" {
  description = "Use this to find running instance public IPs for SSH or log inspection."
  value       = "aws ec2 describe-instances --region ${var.aws_region} --filters Name=tag:aws:autoscaling:groupName,Values=${aws_autoscaling_group.app.name} Name=instance-state-name,Values=running --query 'Reservations[].Instances[].PublicIpAddress' --output text"
}
