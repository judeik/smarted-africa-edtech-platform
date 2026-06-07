# SmartEd Africa — Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 22+ (for local backend development)
- Python 3.11+ (for local AI service development)

---

## Quick Start (Docker Compose)

```bash
# 1. Clone the repository
git clone <repo-url>
cd team-14-smarted-africa

# 2. Create environment file
cp .env.example .env
# Edit .env — fill in all secrets

# 3. Build and start all services
docker compose up --build -d

# 4. Verify
docker compose ps
curl http://localhost:5000/api/health
```

**Service URLs after compose up:**
| Service | URL |
|---------|-----|
| Frontend | http://localhost:80 |
| Backend API | http://localhost:5000 |
| AI Service | http://localhost:8001 |

---

## Environment Variables

### Root `.env` (docker-compose)
```env
MONGO_USER=smarted
MONGO_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>

# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-char-hex>
REFRESH_SECRET=<64-char-hex>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=<app-password>
EMAIL_FROM=no-reply@smarted.africa

PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
FRONTEND_URL=https://yourdomain.com

OPENAI_API_KEY=sk-...

VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_AI_URL=https://ai.yourdomain.com
```

---

## Platform Deployment Options

### Railway
1. Create project, add services: Backend, AI, MongoDB, Redis, Frontend
2. Link GitHub repo, set envvars per service
3. Backend start: `node server.js`  
   AI start: `uvicorn openai_api:app --host 0.0.0.0 --port 8001`

### Render
```yaml
# Backend
type: web
runtime: node
buildCommand: cd backend && npm install
startCommand: cd backend && node server.js

# AI Service
type: web
runtime: python
buildCommand: cd AI-ML && pip install -r requirements.txt
startCommand: cd AI-ML && uvicorn openai_api:app --host 0.0.0.0 --port $PORT

# Frontend (Static Site)
buildCommand: cd frontend && npm install && npm run build
publishDir: frontend/dist
```

### DigitalOcean App Platform
1. Connect repo → Add components: frontend (static), backend (Node), ai-service (Python)
2. Attach managed MongoDB and Redis addons
3. Set environment variables in the App console

### VPS / Bare Metal (Ubuntu)
```bash
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin
git clone <repo> /opt/smarted && cd /opt/smarted
cp .env.example .env && nano .env
docker compose up -d

# Nginx reverse proxy
nginx:
  /           → frontend:80
  /api/       → backend:5000
  /ai/ask     → ai-service:8001

# SSL
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## Local Development

```bash
# Backend
cd backend && cp .env.example .env && npm install && npm run dev

# Frontend
cd frontend && cp .env.example .env && npm install && npm run dev

# AI Service
cd AI-ML && pip install -r requirements.txt
# Create AI-ML/.env with OPENAI_API_KEY=sk-...
uvicorn openai_api:app --reload --port 8001
```

---

## Health Checks

```bash
curl http://localhost:5000/api/health   # Backend
curl http://localhost:8001/health       # AI Service
```

---

## Backup & Restore

```bash
# MongoDB backup
docker exec mongodb mongodump --uri "$MONGO_URI" --out /backup
docker cp mongodb:/backup ./backup-$(date +%Y%m%d)

# MongoDB restore
docker cp ./backup mongodb:/backup
docker exec mongodb mongorestore --uri "$MONGO_URI" /backup
```
