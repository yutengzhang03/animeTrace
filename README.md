# animeTrace

[English](./README.md) | [简体中文](./README.zh-CN.md)

animeTrace is a lightweight multi-user anime tracking app. Search anime from the official Bangumi API, save shows to your own library, and track status, progress, rating, and notes.

It is built for local development, single-port production hosting, and AWS deployment with Terraform-managed Auto Scaling.

## Features

- Multi-user registration and login
- Anime search powered by the official Bangumi v0 API
- Personal library with wish, watching, completed, on hold, and dropped states
- Episode progress, 1-10 rating, and personal notes
- Series grouping for seasons, OVAs, movies, and specials
- Dashboard statistics and dark mode
- Local SQLite storage for development
- Terraform deployment for AWS ALB + Auto Scaling Group + EFS

## Tech Stack

- Frontend: Vue 3, Vite, Tailwind CSS, Element Plus, Pinia, Vue Router
- Backend: Node.js 22, Express, built-in `node:sqlite`
- Auth: PBKDF2 password hashing and HMAC-SHA256 signed tokens
- Data source: Bangumi v0 API
- AWS: Application Load Balancer, Auto Scaling Group, EC2, EFS, CloudWatch CPU alarms

## Project Structure

```text
animeTrace/
├── package.json
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── db.js
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── data/animeTrace.db
├── web/
│   ├── src/
│   └── dist/
└── infra/
    └── terraform/
```

## Local Development

Install all dependencies:

```bash
npm run install:all
```

Start backend and frontend together:

```bash
npm run dev
```

Open:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

The Vite dev server proxies `/api` to the backend.

## Single-Port Production Mode

Build the frontend and serve it from the Express backend:

```bash
npm run serve
```

Open http://localhost:3001.

For production, set a stable token secret so logins survive restarts:

```bash
ANIMETRACE_TOKEN_SECRET="$(openssl rand -hex 32)" npm run serve
```

## AWS Deployment

The recommended AWS path is Terraform:

- Application Load Balancer as the public entry point
- Auto Scaling Group for EC2 instances
- CloudWatch CPU alarms for scale-out and scale-in
- EFS for the shared SQLite database
- Launch Template that installs Node.js 22 and deploys the app

See [DEPLOY-AWS-TERRAFORM.md](./DEPLOY-AWS-TERRAFORM.md).

Most day-to-day AWS settings live in one file:

```bash
infra/terraform/terraform.tfvars
```

Copy the example first:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Then edit instance type, key pair, capacity, CPU thresholds, domain, and other knobs there.

## Environment Variables

| Variable | Default | Description |
|---|---:|---|
| `PORT` | `3001` | Backend listen port |
| `HOST` | `0.0.0.0` | Backend listen host |
| `ANIMETRACE_TOKEN_SECRET` | random on boot | Token signing secret. Set this in production. |
| `ANIMETRACE_DB_PATH` | `server/data/animeTrace.db` | SQLite database path |

## Data Source

animeTrace uses the official Bangumi v0 API: https://bangumi.github.io/api/

## License

MIT
