# Nyasa

Nyasa is a family operating system for shared treasury, projects, Sabha decisions, assets, documents, family skills, and legacy.

This repository is structured like a VS Code and GitHub-ready project.

## Tech Stack

- Frontend: React, Webpack, Babel, React Router
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth foundation: JWT-ready structure
- Package manager: npm workspaces

Recommended local runtime:

- Node.js 20 LTS or newer
- npm 10 or newer
- MongoDB running locally or through MongoDB Atlas

## Project Structure

```text
nyasa/
  apps/
    api/    Node.js + Express + MongoDB API
    web/    React frontend
  docs/     Product and engineering notes
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start MongoDB with Docker:

```bash
npm run db:up
```

Create environment files:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

Run both apps:

```bash
npm run dev
```

For daily development, running API and web in separate terminals is clearer:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Run only backend:

```bash
npm run dev:api
```

Run only frontend:

```bash
npm run dev:web
```

Open the frontend at:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

If you upgrade Node.js while VS Code or a terminal is open, restart VS Code and open a fresh terminal before running npm commands.

## Deployment

EC2 deployment files are in `deploy/`:

- `deploy/ec2-deploy.md`
- `deploy/nginx-nyasa.conf`
- `ecosystem.config.cjs`

## MVP Build Order

1. Auth, family workspace, roles, audit logs
2. Members, family tree, skills
3. Treasury, wallets, append-only ledger
4. Projects, milestones, allocations
5. Expenses, documents, media
6. Sabha, voting, legacy timeline

## Important Engineering Rule

Every tenant-owned API query must be scoped by `familyId`. UI permissions are helpful, but server-side authorization is mandatory.
