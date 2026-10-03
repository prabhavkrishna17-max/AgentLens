# AgentLens Deployment Guide

This guide covers deploying AgentLens for production. The frontend is built as a Single Page Application (SPA) using Vite and React, perfectly suited for Cloudflare Pages. The backend is built with FastAPI, SQLAlchemy, and SQLite. 

> **Important Architecture Note:**
> Cloudflare Python Workers use Pyodide, which does not support C-extensions. Therefore, native SQLite (and SQLAlchemy's SQLite dialect) cannot run directly in a Cloudflare Worker. The safest architecture is to deploy the Frontend to Cloudflare Pages, and host the Backend on a standard Python container host (like Google Cloud Run, Railway, or Render). 

## Architecture

```
GitHub
  ↓
Cloudflare Pages
  ↓
Frontend (React SPA)
  ↓
FastAPI Backend (Container Host e.g., Render/Railway)
  ↓
SQLAlchemy/Alembic
  ↓
Database (Volume-mounted SQLite or Managed PostgreSQL)
```

## Deployment Sequence

### 1. Verify Locally
Ensure your code is production-ready.
```bash
./scripts/verify.sh # or verify.bat on Windows
```

### 2. Git Commit & Push
```bash
git add .
git commit -m "chore: prepare production deployment"
git push origin main
```

### 3. Deploy Backend (Container Host)
Use a service like Railway, Render, or Google Cloud Run.
1. Connect your GitHub repository.
2. Set the root directory to `backend`.
3. The platform should automatically use the provided `Dockerfile`.
4. Configure the following environment variables:
   - `FRONTEND_ORIGIN`: The eventual URL of your frontend (e.g., `https://agentlens.pages.dev`).
   - `DATABASE_URL`: Your database connection string (or omit to use a local volume-mounted `sqlite:///agentlens.db`).
5. Wait for the deployment to finish and note the backend URL.

### 4. Deploy Frontend (Cloudflare Pages)
1. In the Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Select your repository.
3. Configure the build settings:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: The URL of your deployed backend from Step 3 (e.g., `https://agentlens-api.onrender.com`).
5. Save and deploy.
   > **Note:** Automatic production builds and deployments are triggered on every push to the `main` branch.

### 5. Configure SPA Routing (Cloudflare Pages fallback)
If you experience 404s when refreshing subpaths (like `/app/trace`), Cloudflare Pages requires a routing fallback. Vite SPAs handle this gracefully if you ensure your deployment directs 404s to `index.html`. For Cloudflare, deploying to Pages typically handles this if you configure it as an SPA, or you can add a `_routes.json`.

### 6. Final Smoke Test
Once both are deployed, open your frontend URL, create a project, copy the API key, and run a local agent pointing to your production backend URL:
```python
lens = AgentLens(api_key="your_prod_key", base_url="https://api.your-backend.com")
```
Verify the telemetry appears in your deployed dashboard.
