# Blue Rose News Feed

A React news feed app with two deploy targets: a static build using `localStorage` (GitHub Pages), and a database-backed build (AWS ECS).

## Project structure

- `frontend/` — the React + Vite app
- `backend/` — Ruby API used by the database-backed build
- `infra/` — AWS CDK app for provisioning AWS resources for the database-backed build
