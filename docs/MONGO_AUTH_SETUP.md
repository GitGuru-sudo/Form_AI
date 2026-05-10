# MongoDB Authentication Setup for Local Development

## Overview

The Docker setup uses isolated environment variables per service to avoid exposing app secrets (Clerk, Resend, Atlas, HuggingFace) to Mongo containers.

| User | Source | Database | Purpose |
|------|--------|----------|---------|
| Root user | `MONGO_INITDB_ROOT_*` | `admin` | Mongo admin auth and healthcheck |
| App user | `MONGO_APP_*` via `docker/mongo-init.js` | `formai` | Backend runtime connection |

## How User Creation Works

1. Mongo image creates root user from `MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD` on first startup
2. `docker/mongo-init.js` creates app user from `MONGO_APP_*` on first startup (only runs when `mongo_data` volume is empty)

## First-Time Setup

```bash
# Copy and configure .env
cp backend/.env.example backend/.env
# Edit backend/.env with your Mongo credentials

# Reset volume if you previously ran without auth
docker compose down -v

# Start all services
docker compose up --build
```

## Diagnostic Commands

If Mongo becomes unhealthy, run these commands from an elevated terminal:

### 1. Check container status
```powershell
docker compose ps -a
```

### 2. View Mongo logs
```powershell
docker compose logs --no-color --tail=200 mongo
```

### 3. Inspect health state
```powershell
docker inspect ml-mongo-1 --format "{{json .State.Health}}"
```

### 4. Test healthcheck manually
```powershell
docker compose run --rm mongo mongosh --quiet -u "${env:MONGO_INITDB_ROOT_USERNAME}" -p "${env:MONGO_INITDB_ROOT_PASSWORD}" --authenticationDatabase admin --eval "db.adminCommand('ping').ok"
```

### 5. Reset everything (when volume has stale state)
```powershell
docker compose down -v
docker compose up --build
```

### 6. Verify backend is connected
```powershell
docker compose logs --tail=50 backend
# Look for: "MongoDB connected" and "Server started"
```

### 7. Test health endpoint
```powershell
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

## Common Issues

### "Mongo container unhealthy"
- Check logs: `docker compose logs mongo`
- If showing auth errors, volume may have stale users → `docker compose down -v`
- If showing "not enough time for init", increase `start_period` in compose

### "Backend times out waiting for Mongo"
- Healthcheck may be too aggressive for cold start
- Increase `retries` or `start_period` in compose

### "Authentication failed"
- Verify `MONGO_APP_USERNAME` and `MONGO_APP_PASSWORD` match in `.env`
- Verify URL uses `authSource=formai` for app user
- Reset volume to recreate users: `docker compose down -v`

### "Atlas connection fails"
- Verify `MONGODB_URL` includes `/formai` at the end
- Check Atlas IP allowlist includes your current IP
- For local dev without Atlas: use local Docker Mongo with `DOCKER_MONGODB_URL`

## Docker vs AWS Configuration

| Setting | Local Docker | AWS Production |
|---------|--------------|----------------|
| Mongo DB | Local container | Atlas cluster |
| Connection URL | `DOCKER_MONGODB_URL` | `MONGODB_URL` |
| Auth env vars | `MONGO_INITDB_*` | Not needed |
| `RUNNING_IN_DOCKER` | `true` (auto) | Not set |
| Backend .env | All vars | Atlas only |

## Security Notes

- `backend/.env` contains secrets — never commit it to git
- Mongo and mongo-express containers only receive Mongo-specific env vars
- Clerk, Resend, HuggingFace, and Atlas credentials stay only in backend container

## AWS / Atlas Production

When deploying to AWS:
1. Set `MONGODB_URL` to Atlas connection string (must include `/formai`)
2. Set production Clerk keys (not `sk_test_*` / `pk_test_*`)
3. Do NOT set `RUNNING_IN_DOCKER`, `DOCKER_MONGODB_URL`, or `MONGO_INITDB_*`
4. Atlas must have IP allowlist configured for your AWS environment