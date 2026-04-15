# API Gateway Testing Checklist

## 📋 Services Architecture

```
Mobile App (React Native) 
    ↓
API Gateway (Port 8080) - Ocelot
    ├── Node.js Server (Port 5000) - Express + Socket.IO
    └── FastAPI Server (Port 8000) - AI/ML Services
```

## ✅ Configuration Status

### 1. **API Gateway (Port 8080)**
- ✅ `ocelot.json` - All routes configured with `host.docker.internal`
- ✅ `ocelot.Docker.json` - Docker-specific config created
- ✅ `Program.cs` - Health checks and redirects updated
- ✅ `docker-compose.yml` - Uses `host.docker.internal` via extra_hosts
- ✅ Socket.IO routes merged (no duplicates)
- ✅ All endpoints added: progress, workouts, sets, foods, daily-active, water-intake, etc.

### 2. **Mobile App (React Native)**
- ✅ `api.ts` - Uses single gateway URL: `http://localhost:8080/api`
- ✅ `socketService.ts` - Connects via gateway: `ws://localhost:8080`
- ✅ All services route through gateway (no direct API calls)
- ⚠️ **Need to create `.env` file** with gateway URL

### 3. **Node.js Server (Port 5000)**
- ✅ CORS allows gateway origin: `http://localhost:8080`
- ✅ Socket.IO initialized and ready
- ✅ Trust proxy enabled for X-Forwarded-For
- ✅ All API routes versioned: `/api/v1/**`

### 4. **FastAPI Server (Port 8000)**
- ✅ Non-versioned routes: `/api/food/predict`, `/api/chat`, etc.
- ✅ Gateway maps versioned → non-versioned routes

## 🔧 Required Setup Before Testing

### Step 1: Create Application `.env` File

Create file: `c:\Users\yosse\Desktop\ICoach\application\.env`

```env
# API Configuration - POINT TO GATEWAY
EXPO_PUBLIC_API_URL=http://localhost:8080/api
EXPO_PUBLIC_WS_URL=ws://localhost:8080

# Environment
EXPO_PUBLIC_ENV=development
```

**IMPORTANT:** This ensures the mobile app communicates ONLY through the gateway!

### Step 2: Verify Services Are Running

All three services must be running:

```bash
# 1. Node.js Server (Terminal 1)
cd c:\Users\yosse\Desktop\ICoach\server
npm run dev

# 2. FastAPI Server (Terminal 2)
cd c:\Users\yosse\Desktop\ICoach\AI
python main.py

# 3. API Gateway (Terminal 3) - Docker
cd c:\Users\yosse\Desktop\ICoach\ApiGateway
docker-compose up -d
```

### Step 3: Verify Gateway Health

```bash
# Check gateway is running
curl http://localhost:8080/health

# Check gateway can reach backend services
curl http://localhost:8080/ready

# View all available routes
curl http://localhost:8080/debug/routes

# View rate limit status
curl http://localhost:8080/rate-limit-status
```

## 🧪 Test Endpoints

### Authentication Tests

```bash
# 1. Register new user
curl -X POST http://localhost:8080/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"Test123!\"}"

# 2. Login
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d "{\"emailOrUsername\":\"test@example.com\",\"password\":\"Test123!\"}"

# Save the accessToken from login response for subsequent tests
```

### User Profile Tests

```bash
# 3. Get user profile (replace YOUR_TOKEN)
curl -X GET http://localhost:8080/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Update profile
curl -X PUT http://localhost:8080/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"John\",\"lastName\":\"Doe\"}"
```

### Workout Tests

```bash
# 5. Get all workouts
curl -X GET http://localhost:8080/api/v1/workouts \
  -H "Authorization: Bearer YOUR_TOKEN"

# 6. Get workout filters
curl -X GET http://localhost:8080/api/v1/workouts/filters \
  -H "Authorization: Bearer YOUR_TOKEN"

# 7. Get workout sessions
curl -X GET http://localhost:8080/api/v1/workout-sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Progress Tests

```bash
# 8. Get progress dashboard
curl -X GET http://localhost:8080/api/v1/progress/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# 9. Get progress history
curl -X GET http://localhost:8080/api/v1/progress/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Daily Activity Tests

```bash
# 10. Get today's activity
curl -X GET http://localhost:8080/api/v1/daily-active/today \
  -H "Authorization: Bearer YOUR_TOKEN"

# 11. Get activity stats
curl -X GET http://localhost:8080/api/v1/daily-active/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Water Intake Tests

```bash
# 12. Get today's water intake
curl -X GET http://localhost:8080/api/v1/water-intake/today \
  -H "Authorization: Bearer YOUR_TOKEN"

# 13. Get water intake stats
curl -X GET http://localhost:8080/api/v1/water-intake/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Food Tests

```bash
# 14. Search foods
curl -X GET "http://localhost:8080/api/v1/foods/search?q=chicken" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 15. Get high protein foods
curl -X GET http://localhost:8080/api/v1/foods/high-protein \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### AI/FastAPI Tests

```bash
# 16. AI Chat (FastAPI through gateway)
curl -X POST http://localhost:8080/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"message\":\"Hello, suggest a workout\"}"

# 17. Token usage
curl -X GET http://localhost:8080/api/v1/ai/chat/tokens/usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Socket.IO Test (From Mobile App)

The mobile app should automatically connect through the gateway:
- Socket service connects to: `ws://localhost:8080`
- Path: `/socket.io`
- Transports: `['polling', 'websocket']`

## 🐛 Troubleshooting

### Issue: Gateway can't reach Node.js server

**Check:**
```bash
# Is Node.js running?
curl http://localhost:5000/health

# Can Docker reach the host?
docker exec icoach-gateway curl http://host.docker.internal:5000/health
```

**Fix:**
- Ensure Node.js server is running on port 5000
- Check firewall isn't blocking port 5000
- Verify `host.docker.internal` resolves: `ping host.docker.internal`

### Issue: Gateway can't reach FastAPI server

**Check:**
```bash
# Is FastAPI running?
curl http://localhost:8000/docs

# Can Docker reach FastAPI?
docker exec icoach-gateway curl http://host.docker.internal:8000/health
```

**Fix:**
- Ensure FastAPI is running on port 8000
- Check AI service logs for errors

### Issue: Socket.IO not connecting

**Check:**
1. Gateway logs for socket.io routing:
```bash
docker logs icoach-gateway -f
```

2. Node.js server logs for socket connections

3. Mobile app console logs for socket connection status

**Fix:**
- Ensure Socket.IO routes are configured in ocelot.json
- Check CORS settings in Node.js server
- Verify mobile app uses correct gateway URL

### Issue: Rate limiting errors

**Check:**
```bash
curl http://localhost:8080/rate-limit-status
```

**Fix:**
- Adjust rate limits in ocelot.json
- Check if requests exceed limits

## 📊 Expected Results

All requests should:
- ✅ Return 200/201 for successful operations
- ✅ Include `X-Request-Id` header
- ✅ Route through gateway (check Node.js/FastAPI logs show gateway IP)
- ✅ Respect rate limits
- ✅ Work with authentication tokens

## 🚀 Quick Start Commands

```bash
# 1. Stop all services
docker-compose -f ApiGateway/docker-compose.yml down
# Stop Node.js and FastAPI terminals

# 2. Start Node.js server
cd server
npm run dev

# 3. Start FastAPI server
cd AI
python main.py

# 4. Start API Gateway
cd ApiGateway
docker-compose up -d --build

# 5. Create .env for mobile app
# (See Step 1 above)

# 6. Start mobile app
cd application
npm start
```

## 📝 Notes

- **All API calls** go through gateway at `http://localhost:8080`
- **No direct calls** to port 5000 or 8000 from mobile app
- **WebSocket connections** also route through gateway
- **Rate limiting** is enforced by gateway, not backend services
- **CORS** is configured on both gateway and Node.js server
