# Cloud Deployments (AWS / DigitalOcean)

There are dozens of pathways for deploying React and Node setups natively in AWS or Droplets. The cleanest structure limits hosting maintenance.

## Pathway A: Managed Services Route (Easiest)

**Database**: Provision a managed database (Neon.tech natively maps into Postgres effortlessly, highly recommended because it handles pooling implicitly, or AWS RDS).
**Frontend**: Vercel or AWS Amplify. Bind directly to the `frontend/` directory context, map VITE_ secrets into pipeline natively. The CDN acts perfectly.
**Backend**: Render or AWS Elastic Beanstalk mapping Node logic natively and parsing `backend/.env.production` keys smoothly into service wrappers locally.

## Pathway B: Single Monocore (DigitalOcean)

If you prefer cheap reliable hardware:

1. Provision Linux Unbuntu Droplet.
2. SSH into instance -> Install Docker and Git.
3. Clone Repo inside `/var/www/pos-system`.
4. Run standard Native steps defined natively in `docker-setup.md`.
5. Run generic certbot against mapping ports for HTTPS resolution natively handling Cert derivations via Let's Encrypt smoothly integrating directly down.

We explicitly mapped PM2 integration boundaries matching container execution standards in backend allowing Native processes tracking.
