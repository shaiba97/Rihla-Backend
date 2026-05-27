# Project Checklist & Quick Reference

## ✅ Setup Checklist

### Initial Setup
- [ ] Clone repository: `git clone https://github.com/shaiba97/Rihla.git`
- [ ] Navigate to project: `cd Rihla`
- [ ] Copy env file: `cp backend/.env.example backend/.env`
- [ ] Edit env file with local values
- [ ] Install backend dependencies: `cd backend && npm install`
- [ ] Install frontend dependencies: `cd ../admin && npm install && cd ../company && npm install && cd ../customer && npm install`

### Database & Cache
- [ ] PostgreSQL running on localhost:5432
- [ ] Redis running on localhost:6379
- [ ] Run migrations: `cd backend && npx prisma migrate dev`
- [ ] (Optional) Seed database: `npx prisma db seed`

### Development
- [ ] Start backend: `cd backend && npm run start:all`
- [ ] Start admin UI: `cd admin && npm start` (port 4000)
- [ ] Start company UI: `cd company && npm start` (port 4200)
- [ ] Start customer UI: `cd customer && npm start` (port 4100)

### Verification
- [ ] Admin API: http://localhost:3000/api/health
- [ ] Company API: http://localhost:3001/api/health
- [ ] Customer API: http://localhost:3002/api/health
- [ ] Swagger Docs: http://localhost:3000/api/docs

---

## 🚀 Quick Commands

### Backend
```bash
# Install & setup
cd backend
npm install
npx prisma migrate dev

# Development
npm run start:all              # All services
npm run start:dev:all          # Watch mode
npm run start:debug:all        # Debug mode

# Individual services
npm run start:admin            # Port 3000
npm run start:company          # Port 3001
npm run start:customer         # Port 3002

# Quality
npm run lint
npm run format
npm run test
npm run test:cov

# Build & Production
npm run build
npm run start:prod
```

### Frontend
```bash
# Admin (Port 4000)
cd admin
npm install
npm start
npm run build

# Company (Port 4200)
cd company
npm install
npm start
npm run build:mobile           # Capacitor
npm run android                # Android build
npm run ios                    # iOS build

# Customer (Port 4100)
cd customer
npm install
npm start
npm run build
```

### Docker
```bash
# Development with Docker Compose
docker-compose up -d
docker-compose logs -f backend
docker-compose down

# Production
docker build -t rihla:latest .
docker run -d -p 3000:3000 -p 3001:3001 -p 3002:3002 rihla:latest
```

### Database
```bash
# Migrations
cd backend
npx prisma migrate dev
npx prisma migrate status
npx prisma migrate resolve

# Utilities
npx prisma studio              # Visual database explorer
npx prisma format              # Format schema
npx prisma generate            # Generate Prisma client
```

---

## 📚 Documentation Files

| File | Content | For |
|------|---------|-----|
| `README.md` | Project overview, setup | Everyone |
| `CONTRIBUTING.md` | How to contribute | Contributors |
| `IMPROVEMENTS.md` | All changes made | Project leads |
| `docs/architecture.md` | System design | Architects, senior devs |
| `docs/environment.md` | Configuration guide | DevOps, developers |
| `docs/deployment.md` | Deploy to production | DevOps, SRE |
| `docs/api.md` | API endpoints | Frontend devs, integrators |
| `.env.example` | Configuration template | Everyone |

---

## 🔧 Common Issues & Solutions

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection string
psql "postgresql://user:password@localhost:5432/rihla"

# Fix .env DATABASE_URL
```

### "Redis connection refused"
```bash
# Check Redis is running
redis-cli ping

# Start Redis
redis-server

# Check .env REDIS_HOST and REDIS_PORT
```

### "Port already in use"
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
ADMIN_PORT=3010
```

### "Module not found"
```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Reinstall specific package
npm install missing-package
```

### "TypeScript errors"
```bash
# Rebuild TypeScript
npm run build

# Check tsconfig.json is correct
npx tsc --noEmit
```

---

## 📊 Project Structure

```
Rihla/
├── backend/                    # NestJS backend
│   ├── apps/
│   │   ├── admin/             # Admin service (port 3000)
│   │   ├── company/           # Company service (port 3001)
│   │   └── customer/          # Customer service (port 3002)
│   ├── libs/                  # Shared libraries
│   │   ├── auth/
│   │   ├── common/
│   │   ├── prisma/
│   │   ├── redis/
│   │   ├── pdf/
│   │   └── websocket/
│   ├── prisma/                # Database schema
│   ├── package.json
│   └── tsconfig.json
├── admin/                     # Admin Angular app (port 4000)
│   ├── src/
│   ├── package.json
│   └── angular.json
├── company/                   # Company Angular app (port 4200)
│   ├── src/
│   ├── package.json
│   └── angular.json
├── customer/                  # Customer Angular app (port 4100)
│   ├── src/
│   ├── package.json
│   └── angular.json
├── docs/                      # Documentation
│   ├── architecture.md
│   ├── environment.md
│   ├── deployment.md
│   └── api.md
├── README.md                  # Project overview
├── CONTRIBUTING.md            # Contribution guidelines
├── IMPROVEMENTS.md            # Improvements summary
└── .env.example               # Environment template
```

---

## 🔐 Environment Variables Reference

### Required Variables
```env
NODE_ENV=development|production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
ADMIN_PORT=3000
COMPANY_PORT=3001
CUSTOMER_PORT=3002
CORS_ORIGINS=http://localhost:4000,http://localhost:4100,http://localhost:4200
```

### Optional Variables
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=52428800
WHATSAPP_ENABLED=false
```

---

## 🧪 Testing Guide

### Run All Tests
```bash
cd backend
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # With coverage
```

### Run Specific Test
```bash
npm run test -- --testNamePattern="UserService"
```

### Test Structure
```typescript
describe('UserService', () => {
  it('should create a user', () => {
    // Arrange, Act, Assert
  });
});
```

---

## 📱 Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Admin API | 3000 | http://localhost:3000 |
| Company API | 3001 | http://localhost:3001 |
| Customer API | 3002 | http://localhost:3002 |
| Admin UI | 4000 | http://localhost:4000 |
| Customer UI | 4100 | http://localhost:4100 |
| Company UI | 4200 | http://localhost:4200 |
| PostgreSQL | 5432 | postgres://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |

---

## 🚢 Deployment Checklist

- [ ] All tests passing
- [ ] Code linting successful
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis accessible
- [ ] Build succeeds
- [ ] Health checks passing
- [ ] Logging configured
- [ ] Backups enabled
- [ ] Monitoring setup
- [ ] Security review done

---

## 👥 Getting Help

1. **Check Documentation**
   - Start with `README.md`
   - Review relevant `docs/` file

2. **Look for Examples**
   - Check existing code patterns
   - Review test files

3. **Search Issues**
   - GitHub Issues for similar problems
   - Check CONTRIBUTING.md

4. **Ask Community**
   - GitHub Discussions
   - Email: support@rihla.dev

---

**Last Updated**: May 2026
**Version**: 0.0.1
