output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app_server.id
}

output "public_ip" {
  description = "Elastic IP address"
  value       = aws_eip.app_server.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh ubuntu@${aws_eip.app_server.public_ip}"
}

output "domain_dns_record" {
  description = "DNS A record to create"
  value       = "Create A record: ${var.domain_name} -> ${aws_eip.app_server.public_ip}"
}

output "instance_state" {
  description = "Current instance state"
  value       = aws_instance.app_server.instance_state
}