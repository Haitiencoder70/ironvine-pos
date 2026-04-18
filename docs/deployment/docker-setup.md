# Docker Installation Setup

Running the platform locally or completely siloed onto a single EC2/Droplet instance is simple leveraging `docker-compose`.

## Procedure

1. Extract standard mappings natively:
   `cp .env.example .env` inside the root folder, defining exact Database creds mapping your container preferences.
2. Duplicate production templates for specifics mapping directly to the underlying frontend & backend layers explicitly ensuring production strings are filled matching Clerk dashboards.
   `cp backend/.env.production backend/.env.production` -> Fill required fields natively.
   `cp frontend/.env.production frontend/.env.production` -> Fill required fields natively.
3. Run the orchestration pipeline natively. You usually want it disconnected from stdout utilizing `-d`:
   `docker-compose up -d --build`

### What happens now?
- **Port 5432** accepts native volume-linked postgres mappings safely without data wipe upon down spins.
- **Port 3001** hosts the backend explicit Docker image compiled leveraging multistage optimized builds serving the Express pipeline alongside graceful shutdowns.
- **Port 80** targets NGINX serving static React-Router hooked assets safely delivering your GUI externally natively mapped for zero lag performance.

To pull updates:
```bash
git pull
docker-compose up -d --build
```
