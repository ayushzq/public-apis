# Deploying BaseKey CRM to AWS

Three options, easiest first. All three use the `Dockerfile` at the repo
root, so pick whichever fits your comfort level — the container is the
same either way.

## Prerequisites (all options)

1. A Neon Postgres database — copy its connection string into `DATABASE_URL`.
2. Every value in `.env.example` filled in and stored as a **secret**, not
   plain env vars, for anything sensitive (tokens, API keys).
3. Run `npx prisma migrate deploy` once against your production database
   before first boot (or as a one-off ECS/App Runner task) — this creates
   the tables, including the new `SystemSettings` AI-provider and
   feature-toggle columns and the `ChatFlow` table used by the Flow
   Builder.

---

## Option A — AWS App Runner (simplest, fully managed, no VPC needed)

1. Push this repo to ECR or connect App Runner directly to your GitHub repo.
2. Create an App Runner service → source: your image/repo → it auto-detects
   the `Dockerfile`.
3. Under **Configuration → Environment variables**, add everything from
   `.env.example`. Use **Environment secrets** (backed by Secrets Manager)
   for `DATABASE_URL`, `NEXTAUTH_SECRET`, `CLOUDINARY_API_SECRET`, and any
   OAuth/API secret.
4. Port: `3000` (matches `EXPOSE 3000` in the Dockerfile).
5. Deploy. App Runner gives you an HTTPS URL immediately — set that as
   `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`, then redeploy once so the
   build picks up the real URL.
6. Point your WhatsApp Cloud API webhook (Meta App dashboard) at
   `https://<your-app-runner-url>/api/webhook`.

## Option B — ECS Fargate (more control, needs a VPC + ALB)

1. Push the image: `docker build -t basekey-crm . && docker push <ecr-repo-uri>`.
2. Create a Fargate task definition using that image, port 3000.
3. Put secrets in AWS Secrets Manager and reference them in the task
   definition's `secrets` block (not `environment`) for anything sensitive.
4. Put the service behind an Application Load Balancer with an ACM
   certificate for HTTPS (WhatsApp's webhook requires HTTPS).
5. Same webhook URL step as Option A.

## Option C — Elastic Beanstalk (Docker platform)

1. `eb init` → select the "Docker" platform.
2. `eb create basekey-crm-prod`.
3. Set environment variables via `eb setenv KEY=value ...` or the console
   (Configuration → Software → Environment properties) — same list as
   `.env.example`.
4. `eb deploy`.

---

## After first deploy, from the Settings page (not env vars)

The WhatsApp Phone Number ID, Business Account ID, Access Token, and
Webhook Verify Token are stored in the database (`SystemSettings`), not
env vars — set these once by logging in and going to **Settings → WhatsApp
Business API**. This lets you rotate the Meta access token without a
redeploy.

## Database migrations on future deploys

Whenever `prisma/schema.prisma` changes, run:

```
npx prisma migrate deploy
```

against production before (or as part of) the deploy — App Runner/ECS
won't run this for you automatically. A simple approach is a one-off task
using the same image with `CMD ["npx", "prisma", "migrate", "deploy"]`
overridden, run once before the new revision takes traffic.
