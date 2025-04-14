# MobiDrawer Deployment Guide

This guide will walk you through deploying MobiDrawer on an Ubuntu VPS using Docker.

## Prerequisites

- Ubuntu Server (18.04 LTS or newer)
- SSH access to your VPS
- Root or sudo access

## Installation Steps

### 1. Update your system

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Docker and Docker Compose

```bash
# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Add Docker repository
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Update package database and install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Add your user to the docker group to run docker without sudo
sudo usermod -aG docker $USER
```

You may need to log out and log back in for the group membership to take effect.

### 3. Clone your repository (if using Git)

```bash
git clone <your-repository-url>
cd <repository-directory>
```

### 4. Deploy with Docker Compose

```bash
docker-compose up -d
```

### 5. Verify your deployment

```bash
docker-compose ps
```

All services should be in a "running" state.

## Configure a domain (Optional)

If you want to use a domain name with your application:

1. Point your domain's DNS A record to your VPS IP address
2. Install Nginx as a reverse proxy:

```bash
sudo apt install -y nginx
```

3. Create an Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/mobidrawer
```

4. Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/mobidrawer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. Set up SSL with Let's Encrypt (recommended):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Maintenance Commands

- View logs:
  ```bash
  docker-compose logs -f [service_name]
  ```

- Restart services:
  ```bash
  docker-compose restart [service_name]
  ```

- Stop all services:
  ```bash
  docker-compose down
  ```

- Update your deployment (after pulling new code):
  ```bash
  docker-compose down
  docker-compose build
  docker-compose up -d
  ```

## Troubleshooting

- If any service fails to start, check its logs:
  ```bash
  docker-compose logs [service_name]
  ```

- If MongoDB or Redis fail to start, check for permission issues with volumes:
  ```bash
  sudo chown -R $USER:$USER redis_data mongodb_data
  ```

- If the frontend cannot connect to the backend, verify the API_WEB environment variable in the frontend Dockerfile.