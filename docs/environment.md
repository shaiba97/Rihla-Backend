# Environment Configuration Guide

## Overview

The Rihla project uses environment variables to configure different services. Each service reads from a `.env` file in the `backend/` directory.

## Required Variables

### Node Environment
```
NODE_ENV=development|production|test
```
- `development`: For local development with verbose logging
- `production`: For production deployments
- `test`: For test environments

### Port Configuration

Each microservice runs on its own port:

```
ADMIN_PORT=3000
COMPANY_PORT=3001
CUSTOMER_PORT=3002
```

### CORS Configuration

Comma-separated list of allowed origins:

```
CORS_ORIGINS=http://localhost:4000,http://localhost:4100,http://localhost:4200
```

For production, update with actual domain:
```
CORS_ORIGINS=https://admin.example.com,https://company.example.com,https://customer.example.com
```

### Database Connection

PostgreSQL connection string:

```
DATABASE_URL=postgresql://username:password@localhost:5432/rihla
```

Format: `postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]`

Example for local development:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/rihla
```

### JWT Authentication

Secret key for JWT token signing:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

⚠️ **Production**: Use a strong, random 32+ character string.

### Redis Cache

Redis connection configuration:

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password
```

For Redis with authentication:
```
REDIS_PASSWORD=your-redis-password
```

### Upload Configuration

File upload settings:

```
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=52428800  # 50MB in bytes
```

### WhatsApp Integration (Optional)

Enable WhatsApp notifications:

```
WHATSAPP_ENABLED=false
WHATSAPP_PHONE_NUMBER=+1234567890
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
```

## Sensitive Variables (Production Only)

Do NOT commit actual values for these to version control:

- `JWT_SECRET`
- `DATABASE_URL` (password)
- `REDIS_PASSWORD`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `API_KEYS` (payment gateways, etc.)

Use secure secret management:
- GitHub Secrets for CI/CD
- Docker secrets for containers
- AWS Secrets Manager / Azure KeyVault for cloud
- HashiCorp Vault for on-premise

## Setup Instructions

### 1. Create .env file

```bash
cd backend
cp .env.example .env
```

### 2. Configure for Your Environment

Edit `.env` with your local or deployment settings:

```bash
vim .env
```

### 3. Validate Configuration

The application will exit with clear error messages if required variables are missing.

### 4. Load Database Schema

```bash
npx prisma migrate dev
```

## Environment Examples

### Local Development

```env
NODE_ENV=development
ADMIN_PORT=3000
COMPANY_PORT=3001
CUSTOMER_PORT=3002
CORS_ORIGINS=http://localhost:4000,http://localhost:4100,http://localhost:4200
DATABASE_URL=postgresql://postgres:password@localhost:5432/rihla_dev
JWT_SECRET=dev-secret-key-not-for-production
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=52428800
NODE_ENV=development
```

### Production (Example)

```env
NODE_ENV=production
ADMIN_PORT=3000
COMPANY_PORT=3001
CUSTOMER_PORT=3002
CORS_ORIGINS=https://admin.rihla.com,https://company.rihla.com,https://customer.rihla.com
DATABASE_URL=postgresql://prod_user:SECURE_PASSWORD@prod-db.aws.com:5432/rihla_prod
JWT_SECRET=LONG_RANDOM_SECURE_STRING_HERE
REDIS_HOST=prod-redis.aws.com
REDIS_PORT=6379
REDIS_PASSWORD=SECURE_REDIS_PASSWORD
UPLOAD_DIR=/var/uploads
MAX_UPLOAD_SIZE=104857600
```

### Docker/Kubernetes

```env
NODE_ENV=production
ADMIN_PORT=3000
COMPANY_PORT=3001
CUSTOMER_PORT=3002
CORS_ORIGINS=https://api.rihla.example.com
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres-service:5432/rihla
JWT_SECRET=${JWT_SECRET}
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
UPLOAD_DIR=/mnt/uploads
MAX_UPLOAD_SIZE=104857600
```

## Validation & Errors

### Missing Required Variable

If a required variable is missing:

```
Error: Missing environment variable: DATABASE_URL
Please set DATABASE_URL in .env file
```

### Invalid Database URL

```
Error: Invalid DATABASE_URL format
Expected: postgresql://user:password@host:port/dbname
```

### Connection Failures

The app will log detailed connection errors:

```
Error: Could not connect to PostgreSQL
Check DATABASE_URL and ensure PostgreSQL is running
```

## Docker Environment

When using Docker, pass environment variables via:

### Docker Compose

```yaml
services:
  admin:
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:password@db:5432/rihla
      JWT_SECRET: ${JWT_SECRET}
```

### Docker Run

```bash
docker run -e DATABASE_URL=postgresql://... -e JWT_SECRET=... rihla:latest
```

## Kubernetes Secrets

Create Kubernetes secrets:

```bash
kubectl create secret generic rihla-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=... \
  --from-literal=REDIS_PASSWORD=...
```

Reference in deployment:

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: rihla-secrets
        key: DATABASE_URL
```

## Troubleshooting

### Cannot connect to database
- Verify DATABASE_URL is correct
- Check PostgreSQL is running: `psql -U postgres -h localhost`
- Test connection: `psql $DATABASE_URL`

### Redis connection failed
- Check Redis is running: `redis-cli ping`
- Verify REDIS_HOST and REDIS_PORT
- Test: `redis-cli -h $REDIS_HOST -p $REDIS_PORT ping`

### CORS errors in browser
- Add frontend URL to CORS_ORIGINS (comma-separated)
- Restart backend services after change
- Check browser console for actual origin being used

### JWT errors
- Ensure JWT_SECRET is set and consistent across all services
- Don't change JWT_SECRET in production (invalidates all tokens)
- Each service should use same JWT_SECRET

## Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use `.env.example`** - Share configuration structure without secrets
3. **Rotate secrets regularly** - Change JWT_SECRET, DB passwords periodically
4. **Use strong values** - Minimum 32 characters for secrets
5. **Environment parity** - Keep dev/prod configs similar
6. **Document requirements** - Keep this guide updated with new variables
7. **Use secret management** - Never hardcode in source code
8. **Test configuration** - Validate startup with new environment

## Support

For environment configuration issues:
- Check `.env.example` for correct format
- Review error messages in application logs
- Ensure all required services (DB, Redis) are running
- Verify firewall/network connectivity to external services
