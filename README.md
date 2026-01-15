# Node.js Production Application

Production-grade Node.js app with PostgreSQL deployment pipeline, and infrastructure as code.

## Features:
- Terraform + Cloudinit for IaC and configuration management 
- Git/Github for version control
- Github Actions for CI/CD
- Docker Compose for container management
- Github container registry for packaging

## Running Locally

### Prerequisites
- Docker and Docker Compose
- Node.js 22+
- Terraform
- AWS

Note: If deploying locally, you can simply just test the nodejs app by running the following commands.

__Build image with specified tag__
```bash
cd api
docker build -t ghcr.io/yutee/credpal-tha:latest .
```

__Start the services__
```bash
cd docker
echo "password" > .env
docker compose up
```

Application runs at `http://localhost:3000`

### Test Endpoints

```bash
curl http://api.credpal.com/health
curl http://api.credpal.com/status
curl -X POST http://api.credpal.com/process \ 
  -H "Content-Type: application/json" \
  -d '{"job":"test"}'
{"message":"Processing accepted"}
```

## Deploying the Application

### One-Time Infrastructure Setup

1. **Configure Terraform variables:**

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
- `domain_name`: Your domain
- `ssh_public_key`: Your SSH public key
- `db_password`: Secure database password
- `letsencrypt_email`: Email for SSL certificates
- `github_repo`: The repo, default has been set so you can test with this public repo

2. **Create S3 bucket for Terraform state:**

```bash
aws s3 mb s3://credpal-tha-terraform-state --region us-east-1
```

Update bucket name in `infra/main.tf` backend configuration.

3. **Deploy infrastructure:**

```bash
cd infra
terraform init
terraform apply
```

4. **Create DNS A record:**

Point your domain to the Elastic IP from terraform output:
```bash
terraform output public_ip
```

Alternatively, you can use the `/etc/hosts` file

5. **Configure GitHub Secrets:**

Add these secrets in GitHub repository settings:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EC2_SSH_PRIVATE_KEY`
- `SSH_PUBLIC_KEY`
- `DB_PASSWORD`
- `DOMAIN_NAME`
- `LETSENCRYPT_EMAIL`
- `EC2_HOST` (IP from terraform output)

### Deploying Application Updates

**Automatic (CI):**
- Push to `main` branch
- Workflow to run tests and then build docker image builds and pushes to GitHub Container Registry runs automatically

**Manual (Application Deployment):**
1. Go to GitHub Actions
2. Select "Deploy Application" workflow
3. Click "Run workflow"
4. Provide deployment reason
5. Approve when prompted (Manual approval gate)

The deployment:
- Copies `docker-compose.yaml` to server
- Pulls latest image
- Restarts services
- Verifies health check


### Infrastructure Updates

Push changes to `infra/` directory:
- GitHub Actions automatically runs `terraform plan`
- On main branch, applies changes automatically

You can you this if secrets has been set and aws access configured.
There is a workflow that runs terraform commands to provision infratructure.

Or manually:
```bash
cd infra
terraform plan
terraform apply
```

## Key Decisions

### Security

**Container Security:**
- Non-root user (uid 1001) in Docker container
- Minimal Alpine-based images
- No secrets in images or code. handled in Github Secrets and option to use AWS secrets manager if provided.

**Network Security:**
- VPC with security groups
- Only ports 22, 80, 443 exposed
- Database not publicly accessible (Docker internal network)
- SSH key-based authentication only

**SSL/TLS:**
- Automated Let's Encrypt certificates via Certbot
- TLS 1.2+ only
- Automatic certificate renewal via systemd timer

NB: Due to lack of public domain name, this part of the setup does not work, but the configuration to implememnt this is well outlined in the `cloudinit.yaml` file.

**Secrets Management:**
- GitHub Secrets for CI/CD credentials
- Environment variables for runtime secrets
- No hardcoded passwords
- AWS Secrets Manager option added to NodeJS

**Decision:** Chose Let's Encrypt over AWS ACM for cloud portability. Chose SSH keys over password authentication for better security.

### CI/CD

**Pipeline Strategy:**
- **CI Workflow:** Runs on every push/PR - tests with real PostgreSQL, builds image
- **Deploy Workflow:** Manual trigger with approval gate for production safety
- **Infra Workflow:** Automatic on infrastructure changes with approval gate to prevent unchecked provisioning

**Manual Approval:**
- Uses `trstringer/manual-approval@v1` action
- Prevents accidental production deployments
- Creates audit trail via GitHub issues

**Container Registry:**
- GitHub Container Registry (ghcr.io) - used public repo
- Free, integrated with GitHub Actions
- No external dependencies

**Decision:** Chose manual triggering the main deployment workflow over automatic to ensure human review of production changes. Chose GitHub Container Registry over DockerHub for better integration and no rate limits.

### Infrastructure

**Architecture:**
- Single EC2 instance (t3.small)
- VPC with public subnet and Internet Gateway
- Nginx on host for reverse proxy and SSL termination
- Docker Compose for application and database
- Cloud-init for automated server setup

**Why Single EC2 over ECS/Fargate:**
- **Simplicity:** Direct server access, standard Linux tools
- **Portability:** Easy migration to any cloud or on-premise servers
- **Cost:** ~$20/month vs ~$100/month for managed services like ECS+RDS+ALB
- **Control:** Full operations control and system access for debugging
- **Backup:** Backup can be setup to run periodically, database saved to S3 bucket and a workflow for recovery setup

**Why Cloud-init over Ansible:**
- **Single source of truth:** All configuration in Terraform
- **Idempotent:** Instance recreation = automatic reconfiguration
- **No dependencies:** No Ansible controller needed
- **Terraform-native:** Easy variable passing

**Why Nginx on Host vs Container:**
- **SSL management:** Certbot integration simpler on host
- **Port binding:** Direct 80/443 binding, no Docker port mapping
- **Independence:** Nginx restart doesn't affect application
- **Standard pattern:** Industry-standard reverse proxy setup
- **Load balancing:** If multiple docker images running on multiple servers in the VPC, Nginx can be configured as load balancer

**Infrastructure as Code:**
- Terraform for all AWS resources
- Single `terraform apply` creates everything
- Single `terraform destroy` removes everything
- State stored in S3 with versioning
- Cloudinit for config management

**Decision:** Prioritized simplicity and portability over AWS-native features. Infrastructure can be migrated to GCP, Azure, or on-premise with minimal changes.

### Trade-offs Made

**Scalability for Simplicity:**
- Current: Single server, vertical scaling only
- Handles: 100-500 requests/s, 1000 concurrent connections
- To scale horizontally: Add load balancer (or leverage Nginx) and multiple instances (or docker images)

**Availability for Cost:**
- Current: Single instance, ~99.5% uptime
- No automatic failover
- Acceptable for non-critical applications
- To improve: Add Auto Scaling Group and ALB (~$100/month)

**Managed Services for Portability:**
- Database in Docker vs RDS
- Easier migration, manual backups
- For production-critical: Consider RDS for automated backups/failover

## Cost Estimate

Around $20 for single instance

## Monitoring

**Implemented:**
- Health check endpoint (`/health`)
- Docker logs: `docker-compose logs -f app`
- Nginx access/error logs: `/var/log/nginx/`