# 🐳 iCoach Server - Docker Setup Guide

Complete guide for running the iCoach server with Docker, including database management, migrations, and UI tools.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Database Access](#database-access)
- [Docker Commands](#docker-commands)
- [Database Management](#database-management)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

**Check your Docker installation:**
```bash
docker --version
docker-compose --version
```

---

## ⚡ Quick Start

### 1. Clone and Navigate to Project
```bash
cd /path/to/Icoach-app/server
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.docker.example .env

# Edit .env with your preferred text editor
nano .env  # or vim .env or code .env
```

**Important:** Update these values in `.env`:
- `JWT_SECRET` - Change to a secure random string
- `JWT_REFRESH_SECRET` - Change to a different secure random string
- `POSTGRES_PASSWORD` - Change to a secure password
- `MONGO_ROOT_PASSWORD` - Change to a secure password
- Email settings (SMTP_USER, SMTP_PASS)
- OAuth credentials (if using Google OAuth)

### 3. Start All Services
```bash
# Build and start all containers (PostgreSQL, MongoDB, Redis, and Node.js server)
docker-compose up -d --build
```

### 4. Run Database Migrations
```bash
# Run Sequelize migrations to set up PostgreSQL tables
docker-compose exec -T server npx sequelize-cli db:migrate
```

### 5. (Optional) Seed the Database
```bash
# Run seeders to populate with initial data
docker-compose exec -T server npx sequelize-cli db:seed:all
```

### 6. Verify Everything is Running
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f server
```

### 7. Access Your Application
- **API Server**: http://localhost:3000
- **API Documentation (Swagger)**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

---

## 🗄️ Database Access

### PostgreSQL Access

**Default Credentials:**
- **Host**: `localhost`
- **Port**: `5433` (mapped to avoid conflicts)
- **Database**: `icoach_db`
- **Username**: `postgres`
- **Password**: `123` (⚠️ change this in `.env`)

#### Using psql CLI
```bash
# Connect to PostgreSQL inside the container
docker-compose exec postgres psql -U postgres -d icoach_db

# Or from your host machine (if psql is installed)
psql -h localhost -p 5433 -U postgres -d icoach_db
```

#### Using pgAdmin (Recommended UI) 🎨
1. Install [pgAdmin](https://www.pgadmin.org/download/)
2. Open pgAdmin and click "Add New Server"
3. **General Tab:**
   - Name: `iCoach PostgreSQL`
4. **Connection Tab:**
   - Host: `localhost`
   - Port: `5433`
   - Maintenance database: `icoach_db`
   - Username: `postgres`
   - Password: `123`
   - Save password: ✓
5. Click "Save"

#### Using DBeaver (Alternative UI) 🎨
1. Install [DBeaver](https://dbeaver.io/download/)
2. Click "New Database Connection"
3. Select "PostgreSQL"
4. Connection Settings:
   - **Host**: `localhost`
   - **Port**: `5433`
   - **Database**: `icoach_db`
   - **Username**: `postgres`
   - **Password**: `123`
5. Click "Test Connection" then "Finish"

#### Using TablePlus (Alternative UI) 🎨
1. Install [TablePlus](https://tableplus.com/)
2. Click "Create a new connection"
3. Select "PostgreSQL"
4. Fill in:
   - **Name**: `iCoach DB`
   - **Host**: `localhost`
   - **Port**: `5433`
   - **User**: `postgres`
   - **Password**: `123`
   - **Database**: `icoach_db`
5. Click "Connect"

---

### MongoDB Access

**Default Credentials:**
- **Host**: `localhost`
- **Port**: `27018` (mapped to avoid conflicts)
- **Database**: `icoach_nosql`
- **Username**: `admin`
- **Password**: `admin` (⚠️ change this in `.env`)
- **Auth Database**: `admin`

**Connection String:**
```
mongodb://admin:admin@localhost:27018/icoach_nosql?authSource=admin
```

#### Using MongoDB Compass (Recommended UI) 🎨
1. Install [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Open Compass
3. Click "New Connection"
4. Paste this connection string:
   ```
   mongodb://admin:admin@localhost:27018/icoach_nosql?authSource=admin
   ```
5. Click "Connect"

#### Using Studio 3T (Alternative UI) 🎨
1. Install [Studio 3T](https://studio3t.com/download/)
2. Click "Connect" → "New Connection"
3. **Connection Tab:**
   - **Server**: `localhost`
   - **Port**: `27018`
4. **Authentication Tab:**
   - **Authentication Mode**: Username / Password
   - **User Name**: `admin`
   - **Password**: `admin`
   - **Auth DB**: `admin`
5. **Connection Name**: `iCoach MongoDB`
6. Click "Save" then "Connect"

#### Using mongosh CLI
```bash
# Connect to MongoDB inside the container
docker-compose exec mongodb mongosh -u admin -p admin --authenticationDatabase admin

# Or from your host machine (if mongosh is installed)
mongosh "mongodb://admin:admin@localhost:27018/icoach_nosql?authSource=admin"

# Useful mongosh commands:
show dbs                 # List all databases
use icoach_nosql        # Switch to icoach database
show collections        # List all collections
db.users.find()         # Find all users
db.users.countDocuments() # Count documents
```

---

### Redis Access

**Default Credentials:**
- **Host**: `localhost`
- **Port**: `6380` (mapped to avoid conflicts)
- **Password**: None (no password by default)

#### Using RedisInsight (Recommended UI) 🎨
1. Install [RedisInsight](https://redis.com/redis-enterprise/redis-insight/)
2. Open RedisInsight
3. Click "Add Redis Database"
4. Select "Add Database Manually"
5. Fill in:
   - **Host**: `localhost`
   - **Port**: `6380`
   - **Database Alias**: `iCoach Redis`
6. Click "Add Redis Database"

#### Using Another Redis Desktop Manager (Alternative UI) 🎨
1. Install [Another Redis Desktop Manager](https://github.com/qishibo/AnotherRedisDesktopManager)
2. Click "New Connection"
3. Fill in:
   - **Name**: `iCoach Redis`
   - **Address**: `localhost`
   - **Port**: `6380`
4. Click "OK"

#### Using redis-cli
```bash
# Connect to Redis inside the container
docker-compose exec redis redis-cli

# Or from your host machine (if redis-cli is installed)
redis-cli -h localhost -p 6380

# Useful Redis commands:
PING                    # Test connection
KEYS *                  # List all keys
GET key_name           # Get value
SET key_name value     # Set value
DEL key_name           # Delete key
FLUSHALL               # Clear all data (⚠️ use carefully!)
INFO                   # Server information
```

---

## 🎮 Docker Commands

### Starting and Stopping

```bash
# Start all services
docker-compose up -d

# Start with logs visible
docker-compose up

# Stop all services
docker-compose down

# Stop and remove all data (⚠️ WARNING: Deletes all database data!)
docker-compose down -v

# Restart services
docker-compose restart

# Restart specific service
docker-compose restart server
docker-compose restart postgres
docker-compose restart mongodb
docker-compose restart redis
```

### Building and Rebuilding

```bash
# Build/rebuild all services
docker-compose build

# Build specific service
docker-compose build server

# Build and start (rebuild if needed)
docker-compose up -d --build

# Force rebuild (ignore cache)
docker-compose build --no-cache
```

### Viewing Logs

```bash
# View logs for all services
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs server
docker-compose logs postgres
docker-compose logs mongodb
docker-compose logs redis

# View last 50 lines
docker-compose logs --tail=50 server

# Follow logs for multiple services
docker-compose logs -f server postgres

# Since specific time
docker-compose logs --since 30m server
```

### Container Management

```bash
# List all containers
docker-compose ps

# Execute command in container
docker-compose exec server sh
docker-compose exec postgres bash
docker-compose exec mongodb bash

# Execute command as specific user
docker-compose exec -u root server sh

# View resource usage
docker stats

# Remove stopped containers
docker-compose rm

# Remove specific container
docker-compose rm server
```

---

## 💾 Database Management

### PostgreSQL Migrations

```bash
# Run all pending migrations
docker-compose exec -T server npx sequelize-cli db:migrate

# Undo last migration
docker-compose exec -T server npx sequelize-cli db:migrate:undo

# Undo all migrations (⚠️ WARNING!)
docker-compose exec -T server npx sequelize-cli db:migrate:undo:all

# Check migration status
docker-compose exec server npx sequelize-cli db:migrate:status

# Generate new migration
docker-compose exec server npx sequelize-cli migration:generate --name add-user-preferences

# Create a specific migration
docker-compose exec server npx sequelize-cli migration:create --name update-user-schema
```

### PostgreSQL Seeders

```bash
# Run all seeders
docker-compose exec -T server npx sequelize-cli db:seed:all

# Undo all seeders
docker-compose exec -T server npx sequelize-cli db:seed:undo:all

# Run specific seeder
docker-compose exec -T server npx sequelize-cli db:seed --seed 20251023200124-create-admin-user

# Undo specific seeder
docker-compose exec -T server npx sequelize-cli db:seed:undo --seed 20251023200124-create-admin-user

# Generate new seeder
docker-compose exec server npx sequelize-cli seed:generate --name demo-users
```

### Database Backup and Restore

#### PostgreSQL Backup
```bash
# Create backup with timestamp
docker-compose exec postgres pg_dump -U postgres icoach_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Create compressed backup
docker-compose exec postgres pg_dump -U postgres icoach_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup specific table
docker-compose exec postgres pg_dump -U postgres -t users icoach_db > users_backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres icoach_db < backup_20251031_120000.sql

# Restore from compressed backup
gunzip -c backup_20251031_120000.sql.gz | docker-compose exec -T postgres psql -U postgres icoach_db
```

#### MongoDB Backup
```bash
# Create backup
docker-compose exec mongodb mongodump \
  --username admin \
  --password admin \
  --authenticationDatabase admin \
  --db icoach_nosql \
  --out /data/backup

# Copy backup to host
docker cp icoach-mongodb:/data/backup ./mongodb_backup_$(date +%Y%m%d)

# Restore from backup
docker-compose exec mongodb mongorestore \
  --username admin \
  --password admin \
  --authenticationDatabase admin \
  --db icoach_nosql \
  /data/backup/icoach_nosql

# Backup specific collection
docker-compose exec mongodb mongodump \
  --username admin \
  --password admin \
  --authenticationDatabase admin \
  --db icoach_nosql \
  --collection users \
  --out /data/backup
```

### Database Queries

#### PostgreSQL Quick Queries
```bash
# List all tables
docker-compose exec postgres psql -U postgres -d icoach_db -c "\dt"

# Describe table structure
docker-compose exec postgres psql -U postgres -d icoach_db -c "\d users"

# Count users
docker-compose exec postgres psql -U postgres -d icoach_db -c "SELECT COUNT(*) FROM users;"

# View recent users
docker-compose exec postgres psql -U postgres -d icoach_db -c "SELECT id, email, username, \"createdAt\" FROM users ORDER BY \"createdAt\" DESC LIMIT 5;"

# Check database size
docker-compose exec postgres psql -U postgres -d icoach_db -c "SELECT pg_size_pretty(pg_database_size('icoach_db'));"
```

#### MongoDB Quick Queries
```bash
# Show all collections
docker-compose exec mongodb mongosh -u admin -p admin --authenticationDatabase admin --eval "use icoach_nosql; show collections;"

# Count documents in a collection
docker-compose exec mongodb mongosh -u admin -p admin --authenticationDatabase admin --eval "use icoach_nosql; db.logs.countDocuments();"

# Find recent documents
docker-compose exec mongodb mongosh -u admin -p admin --authenticationDatabase admin --eval "use icoach_nosql; db.logs.find().sort({createdAt: -1}).limit(5);"

# Database statistics
docker-compose exec mongodb mongosh -u admin -p admin --authenticationDatabase admin --eval "use icoach_nosql; db.stats();"
```

### Reset Database

```bash
# Reset PostgreSQL (⚠️ WARNING: Deletes all data!)
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS icoach_db;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE icoach_db;"
docker-compose exec -T server npx sequelize-cli db:migrate
docker-compose exec -T server npx sequelize-cli db:seed:all

# Reset MongoDB (⚠️ WARNING: Deletes all data!)
docker-compose exec mongodb mongosh -u admin -p admin --authenticationDatabase admin \
  --eval "db.getSiblingDB('icoach_nosql').dropDatabase();"

# Reset Redis (⚠️ WARNING: Deletes all cached data!)
docker-compose exec redis redis-cli FLUSHALL

# Nuclear option: Reset everything (⚠️ WARNING!)
docker-compose down -v
docker-compose up -d --build
docker-compose exec -T server npx sequelize-cli db:migrate
docker-compose exec -T server npx sequelize-cli db:seed:all
```

---

## 🔧 Environment Variables

### Required Variables

```env
# Server Configuration
NODE_ENV=production          # Environment (development/production)
PORT=3000                    # Server port

# JWT Configuration (⚠️ MUST CHANGE!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-different-from-jwt-secret
JWT_EXPIRES_IN=15m          # Access token expiry (15 minutes)
JWT_REFRESH_EXPIRES_IN=7d   # Refresh token expiry (7 days)
JWT_ISSUER=icoach-app       # Token issuer
JWT_AUDIENCE=icoach-users   # Token audience

# PostgreSQL Configuration
POSTGRES_HOST=postgres      # Docker service name (don't change)
POSTGRES_PORT=5433         # Host port (change if conflict)
POSTGRES_DB=icoach_db      # Database name
POSTGRES_USER=postgres     # Database user
POSTGRES_PASSWORD=your-secure-password-here  # ⚠️ MUST CHANGE!

# MongoDB Configuration
MONGO_ROOT_USER=admin              # MongoDB admin user
MONGO_ROOT_PASSWORD=your-secure-mongo-password  # ⚠️ MUST CHANGE!
MONGO_DB=icoach_nosql             # Database name
MONGO_PORT=27018                  # Host port (change if conflict)

# Redis Configuration
REDIS_PORT=6380           # Host port (change if conflict)
```

### Optional Variables

```env
# OAuth - Google (if using Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Email Configuration (SMTP)
# For Gmail, use App Password: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=noreply@icoach.com

# Application URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880      # 5MB in bytes
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info             # error, warn, info, debug
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
```

### Generating Secure Secrets

```bash
# Generate secure JWT secret (Linux/Mac)
openssl rand -base64 64

# Generate secure JWT secret (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate secure password
openssl rand -base64 32
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Problem:** Error message: `address already in use`

**Solution:** Change ports in `.env`:
```env
PORT=3001              # Server port
POSTGRES_PORT=5434     # PostgreSQL port
MONGO_PORT=27019       # MongoDB port
REDIS_PORT=6381        # Redis port
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Container Keeps Restarting

**Check logs:**
```bash
docker-compose logs server
docker-compose logs postgres
docker-compose logs mongodb
```

**Common causes:**
1. **Database connection failed** - Check credentials in `.env`
2. **Missing environment variables** - Check `.env` file
3. **Port conflicts** - Change ports
4. **Build errors** - Check build logs

**Solution:**
```bash
# Check container status
docker-compose ps

# Restart specific service
docker-compose restart server

# Full restart
docker-compose down && docker-compose up -d
```

### Database Connection Failed

**Check if databases are healthy:**
```bash
docker-compose ps
```

All services should show "Up (healthy)".

**Test PostgreSQL connection:**
```bash
docker-compose exec postgres pg_isready -U postgres
```

**Test MongoDB connection:**
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

**Test Redis connection:**
```bash
docker-compose exec redis redis-cli ping
```

**Solution:**
```bash
# Restart databases
docker-compose restart postgres mongodb redis

# Wait 10 seconds then restart server
sleep 10
docker-compose restart server
```

### Migration Errors

**Error:** `Cannot find module` or `SequelizeConnectionError`

**Solution:**
```bash
# Check if databases are ready
docker-compose ps

# Wait for databases to be healthy
sleep 10

# Try migrations again
docker-compose exec -T server npx sequelize-cli db:migrate
```

**Reset migrations (⚠️ deletes data):**
```bash
# Undo all migrations
docker-compose exec -T server npx sequelize-cli db:migrate:undo:all

# Run migrations again
docker-compose exec -T server npx sequelize-cli db:migrate
```

### Swagger Shows No Endpoints

**Problem:** Swagger UI at `/api-docs` is empty

**Cause:** Route files not found or JSDoc comments missing

**Solution:**
1. Check if server started successfully:
   ```bash
   docker-compose logs server | grep "Swagger"
   ```

2. Rebuild container:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. Check Swagger config in `src/config/swagger.ts`

### Out of Disk Space

**Clean up Docker:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (⚠️ check first!)
docker volume ls
docker volume prune

# Remove unused containers
docker container prune

# Remove everything unused (⚠️ WARNING!)
docker system prune -a --volumes
```

**Check disk usage:**
```bash
# Overall disk usage
docker system df

# Detailed usage
docker system df -v
```

### Permission Denied Errors

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Fix permissions for uploads and logs
sudo chown -R $USER:$USER uploads logs
chmod -R 755 uploads logs

# If still issues, check Docker user
docker-compose exec server whoami
docker-compose exec server ls -la uploads logs
```

### Container Can't Resolve DNS

**Error:** `getaddrinfo EAI_AGAIN` or DNS resolution failed

**Solution:**
```bash
# Add DNS servers to docker-compose.yml
services:
  server:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

### Slow Build Times

**Speed up builds:**
```bash
# Use BuildKit
export DOCKER_BUILDKIT=1
docker-compose build

# Or add to ~/.bashrc or ~/.zshrc
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
```

---

## 📊 Monitoring and Health Checks

### Container Health Status
```bash
# Check all containers
docker-compose ps

# Check specific container health
docker inspect --format='{{.State.Health.Status}}' icoach-server
docker inspect --format='{{.State.Health.Status}}' icoach-postgres

# View health check logs
docker inspect --format='{{json .State.Health}}' icoach-server | python3 -m json.tool
```

### Resource Usage
```bash
# Real-time stats for all containers
docker stats

# Stats for specific container
docker stats icoach-server

# Single snapshot
docker stats --no-stream
```

### Application Health Endpoints
```bash
# Server health check
curl http://localhost:3000/health

# Pretty print JSON
curl -s http://localhost:3000/health | python3 -m json.tool

# Check API documentation
curl -I http://localhost:3000/api-docs
```

### Database Health Checks
```bash
# PostgreSQL
docker-compose exec postgres pg_isready -U postgres

# MongoDB
docker-compose exec mongodb mongosh --quiet --eval "db.adminCommand('ping')"

# Redis
docker-compose exec redis redis-cli ping
```

---

## 🔒 Production Deployment

### Security Checklist

Before deploying to production:

- [ ] Change all default passwords (`POSTGRES_PASSWORD`, `MONGO_ROOT_PASSWORD`)
- [ ] Generate strong JWT secrets (minimum 64 random characters)
  ```bash
  openssl rand -base64 64
  ```
- [ ] Enable PostgreSQL SSL (`POSTGRES_SSL=true`)
- [ ] Enable Redis password protection
- [ ] Use environment-specific `.env` files (`.env.production`)
- [ ] **Never** commit `.env` files to Git
- [ ] Set up proper firewall rules
- [ ] Use HTTPS with reverse proxy (nginx, traefik, or Caddy)
- [ ] Enable rate limiting (already configured)
- [ ] Set up regular database backups (automated cron jobs)
- [ ] Monitor application logs
- [ ] Set resource limits for containers
- [ ] Use Docker secrets or external secret management
- [ ] Enable container restart policies
- [ ] Set up health check monitoring
- [ ] Configure log rotation
- [ ] Use non-root users (already configured)

### Resource Limits

Add to your `docker-compose.yml`:

```yaml
services:
  server:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: '1'        # Max 1 CPU core
          memory: 512M     # Max 512MB RAM
        reservations:
          cpus: '0.5'      # Reserve 0.5 CPU core
          memory: 256M     # Reserve 256MB RAM
    restart: unless-stopped

  postgres:
    # ... existing config
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    restart: unless-stopped
```

### Reverse Proxy (nginx) Example

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Automated Backups

Create `backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
docker-compose exec -T postgres pg_dump -U postgres icoach_db | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# MongoDB backup
docker-compose exec mongodb mongodump \
  --username admin \
  --password admin \
  --authenticationDatabase admin \
  --db icoach_nosql \
  --out /data/backup
docker cp icoach-mongodb:/data/backup $BACKUP_DIR/mongodb_$DATE

# Remove old backups
find $BACKUP_DIR -name "postgres_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "mongodb_*" -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
# Run backup daily at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

---

## 📚 Additional Resources

### Official Documentation
- **Docker**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **MongoDB**: https://docs.mongodb.com/
- **Redis**: https://redis.io/documentation
- **Sequelize**: https://sequelize.org/docs/v6/

### Docker Hub Images
- **Node.js**: https://hub.docker.com/_/node
- **PostgreSQL**: https://hub.docker.com/_/postgres
- **MongoDB**: https://hub.docker.com/_/mongo
- **Redis**: https://hub.docker.com/_/redis

### Database Management Tools
- **pgAdmin** (PostgreSQL): https://www.pgadmin.org/
- **DBeaver** (Multi-database): https://dbeaver.io/
- **TablePlus** (Multi-database): https://tableplus.com/
- **MongoDB Compass**: https://www.mongodb.com/products/compass
- **Studio 3T** (MongoDB): https://studio3t.com/
- **RedisInsight**: https://redis.com/redis-enterprise/redis-insight/

### Learning Resources
- **Docker for Beginners**: https://docker-curriculum.com/
- **PostgreSQL Tutorial**: https://www.postgresqltutorial.com/
- **MongoDB University**: https://university.mongodb.com/
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs:**
   ```bash
   docker-compose logs -f server
   ```

2. **Verify environment variables:**
   ```bash
   docker-compose config
   ```

3. **Check container status:**
   ```bash
   docker-compose ps
   ```

4. **Review this documentation** (you're here!)

5. **Search existing issues** on GitHub

6. **Create a new issue** with:
   - Full error message
   - Docker and Docker Compose versions
   - Operating system
   - Steps to reproduce
   - Relevant logs

---

## 📝 Quick Reference Card

### Essential Commands

```bash
# 🚀 Start everything
docker-compose up -d

# 📊 View logs
docker-compose logs -f server

# 🔄 Run migrations
docker-compose exec -T server npx sequelize-cli db:migrate

# 🌱 Run seeders
docker-compose exec -T server npx sequelize-cli db:seed:all

# 🗄️ Access PostgreSQL
docker-compose exec postgres psql -U postgres -d icoach_db

# 🍃 Access MongoDB
docker-compose exec mongodb mongosh -u admin -p admin --authenticationDatabase admin

# ⚡ Access Redis
docker-compose exec redis redis-cli

# 🔄 Restart server
docker-compose restart server

# 🛑 Stop everything
docker-compose down

# 🧹 Clean restart (keeps data)
docker-compose down && docker-compose up -d

# ☢️ Nuclear option (deletes ALL data!)
docker-compose down -v && docker-compose up -d --build
```

### Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Server** | http://localhost:3000 | - |
| **Swagger Docs** | http://localhost:3000/api-docs | - |
| **Health Check** | http://localhost:3000/health | - |
| **PostgreSQL** | localhost:5433 | postgres / 123 |
| **MongoDB** | localhost:27018 | admin / admin |
| **Redis** | localhost:6380 | (no password) |

### File Locations

| Path | Description |
|------|-------------|
| `.env` | Environment variables |
| `docker-compose.yml` | Full production stack |
| `docker-compose.dev.yml` | Development (databases only) |
| `Dockerfile` | Server container definition |
| `.dockerignore` | Files excluded from Docker build |
| `config/config.cjs` | Sequelize database config |
| `.sequelizerc` | Sequelize paths config |
| `uploads/` | Uploaded files (mounted volume) |
| `logs/` | Application logs (mounted volume) |

---

**🎉 You're all set! Happy coding!**

For application-specific documentation, see [README.md](./README.md)

---

**Last Updated:** October 31, 2025
**Version:** 1.0.0
