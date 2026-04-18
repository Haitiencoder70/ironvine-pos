# Deployment Overview

Deploying the T-Shirt POS requires establishing three synchronized environments:
1. **Frontend Service**: Providing the static bundled Vite output usually delivered via CDN or internal NGINX container.
2. **Backend Express API Node**: Handling all server operations, connections mapping back and forth for Webhooks.
3. **Storage Container**: Storing robust relational data typically natively in PostgreSQL (with PgAdmin for GUI traversal).

## Pre-requisites

Regardless of target platform natively chosen to map resources, the following are absolutely imperative:
- **Environment Keys**: The Clerk IDs, Stripe Secret references, Resend API key combinations, and valid DATABASE_URL must be isolated out locally to ensure non-exposure. 
- **Docker**: Having `docker` and `docker-compose` active speeds deployment exponentially bypassing package dependency issues on host environments.

Read inside this folder for either full Native Cloud Deployments (Serverless architectures / droplet provisioning) or specifically Docker-Compose isolated networks.
