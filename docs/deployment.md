# Deployment Guide

## Overview

This guide covers deploying Rihla to various environments from local development to cloud production.

## Local Development

### Prerequisites

- Node.js 18+ LTS
- npm 11.12.0+
- PostgreSQL 14+
- Redis 6+

### Quick Start

```bash
# Clone and install
git clone https://github.com/shaiba97/Rihla.git
cd Rihla

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with local values

# Database
npx prisma migrate dev

# Start all services
npm run start:all

# Frontend setup (in new terminals)
cd ../admin && npm install && npm start
cd ../company && npm install && npm start
cd ../customer && npm install && npm start
```

Services will be available at:
- Admin: http://localhost:4000
- Company: http://localhost:4200
- Customer: http://localhost:4100
- API Docs: http://localhost:3000/api/docs

## Docker Deployment

### Single Container (Development)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy and install
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend . .

# Database migration
RUN npx prisma generate

EXPOSE 3000 3001 3002

CMD ["npm", "run", "start:prod"]
```

### Build and Run

```bash
# Build image
docker build -t rihla:latest .

# Run container
docker run -d \
  --name rihla \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 3002:3002 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_HOST=host.docker.internal \
  rihla:latest

# View logs
docker logs -f rihla
```

## Docker Compose (Recommended for Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rihla
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/rihla
      REDIS_HOST: redis
      JWT_SECRET: dev-secret
      ADMIN_PORT: 3000
      COMPANY_PORT: 3001
      CUSTOMER_PORT: 3002
    ports:
      - "3000:3000"
      - "3001:3001"
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  postgres_data:

networks:
  default:
    name: rihla-network
```

### Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Remove volumes (careful!)
docker-compose down -v
```

## Kubernetes Deployment

### Prerequisites

- kubectl installed and configured
- Kubernetes cluster (1.20+)
- Docker images pushed to registry

### ConfigMap for Environment Variables

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rihla-config
  namespace: production
data:
  NODE_ENV: "production"
  ADMIN_PORT: "3000"
  COMPANY_PORT: "3001"
  CUSTOMER_PORT: "3002"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

### Secrets

```bash
# Create secrets
kubectl create secret generic rihla-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=... \
  --from-literal=REDIS_PASSWORD=... \
  -n production
```

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rihla-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rihla-backend
  template:
    metadata:
      labels:
        app: rihla-backend
    spec:
      containers:
      - name: backend
        image: your-registry/rihla:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        - containerPort: 3001
        - containerPort: 3002
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: rihla-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: rihla-secrets
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: rihla-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rihla-service
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: rihla-backend
  ports:
  - name: admin
    port: 3000
    targetPort: 3000
  - name: company
    port: 3001
    targetPort: 3001
  - name: customer
    port: 3002
    targetPort: 3002
```

### Deploy

```bash
# Apply configurations
kubectl apply -f k8s/

# Check status
kubectl get pods -n production
kubectl logs -f deployment/rihla-backend -n production

# Scale
kubectl scale deployment rihla-backend --replicas=5 -n production
```

## AWS Deployment

### Elastic Beanstalk

```bash
# Initialize EB
eb init -p node.js-18 rihla --region us-east-1

# Create environment
eb create production

# Set environment variables
eb setenv \
  NODE_ENV=production \
  DATABASE_URL=postgresql://... \
  JWT_SECRET=...

# Deploy
eb deploy

# View logs
eb logs
```

### RDS for PostgreSQL

1. Create RDS instance:
   - Engine: PostgreSQL 14
   - Instance class: db.t3.micro (dev) or db.t3.small (prod)
   - Storage: 20GB initial

2. Update security group to allow port 5432

3. Create database:
   ```bash
   psql -h rds-endpoint.amazonaws.com -U admin -d postgres
   CREATE DATABASE rihla;
   ```

4. Update DATABASE_URL in EB

### ElastiCache for Redis

1. Create Redis cluster:
   - Engine: Redis 7
   - Node type: cache.t3.micro (dev)
   - Update security group

2. Update REDIS_HOST in EB

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: cd backend && npm ci
    - run: npm run lint
    - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and push
      run: |
        docker build -t your-registry/rihla:latest .
        docker push your-registry/rihla:latest
    - name: Deploy to production
      run: |
        kubectl set image deployment/rihla-backend \
          backend=your-registry/rihla:latest \
          -n production
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health
```

### Logging

Logs are output to stdout with Pino formatter:

```bash
# JSON format for log aggregation
kubectl logs deployment/rihla-backend -n production | jq '.'
```

### Performance Monitoring

- Database queries: Monitor slow queries in PostgreSQL logs
- Redis: Monitor memory and hit rates
- Application: Monitor request latency and error rates

## Rollback

### Docker Compose

```bash
# Use specific image version
docker-compose down
git checkout previous-commit
docker-compose up -d
```

### Kubernetes

```bash
# Check rollout history
kubectl rollout history deployment/rihla-backend -n production

# Rollback to previous version
kubectl rollout undo deployment/rihla-backend -n production

# Rollback to specific revision
kubectl rollout undo deployment/rihla-backend --to-revision=2 -n production
```

## Backup & Recovery

### Database Backup

```bash
# Backup
pg_dump $DATABASE_URL > rihla_backup.sql

# Restore
psql $DATABASE_URL < rihla_backup.sql
```

### Automated Backups

- AWS RDS: Enable automated backups (7-35 days retention)
- GCP Cloud SQL: Configure backups via console
- Azure Database: Enable geo-redundant backups

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS for all connections
- [ ] Configure firewall rules
- [ ] Enable database encryption at rest
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable CORS for specific origins only
- [ ] Set up log aggregation and monitoring
- [ ] Regular security patching
- [ ] Database backup testing
- [ ] Disaster recovery plan

## Support

For deployment issues:
1. Check application logs
2. Verify all environment variables are set
3. Ensure external services (DB, Redis) are accessible
4. Review security groups and firewall rules
