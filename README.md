# FormAI

<div align="center">

https://github.com/user-attachments/assets/da4d5aaf-0167-4945-a44a-050a95d3c029

</div>

**Hugging Face model repo: [saksham0510/formai-tinyllama](https://huggingface.co/saksham0510/formai-tinyllama)**

**FormAI was built to reduce the complexity of creating forms in tools like Google Forms and Microsoft Forms. Instead of building everything manually, you can describe the form in a prompt, generate the structure, and then edit the rest easily.**

FormAI is an AI-powered form builder that turns natural-language prompts into editable, publishable forms. Describe the form you need, let the LLM draft the structure, fine-tune the fields, publish a public link, and review responses from your dashboard.

## What It Does

FormAI is built around a simple workflow:

1. Prompt the assistant with a form idea, such as `Customer feedback survey`.
2. Generate a structured form with question types, required fields, and options.
3. Edit the form with the builder before publishing.
4. Share a public form link with respondents.
5. Collect responses and review them from the dashboard.

## Features

- AI form generation from plain-language prompts.
- Editable form builder with reorder, add, remove, and field-type controls.
- Clerk authentication for protected workspaces.
- Public share links for published forms.
- Response dashboard for reviewing submissions.
- MongoDB persistence through Mongoose models.
- Resend-powered email support.
- Hugging Face LLM integration for form generation.
- Docker Compose support for local MongoDB development.

## Tech Stack

| Layer | Stack |
|------|-------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Express.js, TypeScript, Node.js |
| Database | MongoDB, Mongoose |
| Authentication | Clerk |
| Email | Resend |
| AI | Hugging Face model/API |
| Local Infrastructure | Docker Compose, MongoDB |

## Architecture

```text
User
  -> Next.js frontend
  -> Express backend API
  -> MongoDB for forms and responses
  -> Hugging Face API or Space for AI form generation
  -> Clerk for authentication
  -> Resend for email
```

The frontend handles the workspace, editor, dashboard, auth UI, and public form pages. The backend owns API routes, MongoDB models, form persistence, response capture, email, and calls to the configured Hugging Face form-generation endpoint.

## Project Structure

```text
.
+-- backend/                 Express + TypeScript API
+-- frontend/                Next.js app
+-- docker/                  MongoDB initialization scripts
+-- docs/                    Deployment and troubleshooting notes
+-- docker-compose.yml       Local Docker services
+-- hugging_face.md          Hugging Face model and API contract
+-- next_step.md             Local setup walkthrough
+-- README.md                Project overview
```

## Local Setup

Detailed local instructions are in [next_step.md](next_step.md).

Prerequisites:

- Node.js 18+
- Docker, optional for local MongoDB
- Clerk account
- Resend account
- Hugging Face model/API or Space endpoint

Install dependencies:

```bash
cd frontend
npm install --legacy-peer-deps

cd ../backend
npm install
```

Create local env files:

```text
backend/.env
frontend/.env.local
```

Use `backend/.env.example` and `frontend/env.local.example` as templates. Keep real secrets out of version control.

Run the app:

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

Frontend runs on `http://localhost:3000` and backend runs on `http://localhost:8000`.

## Docker Mongo Setup

For local MongoDB:

```bash
docker compose up -d mongo
```

For the optional Mongo admin UI:

```bash
docker compose --profile debug up -d mongo-express
```

If Mongo becomes unhealthy after credential changes, the local Docker volume may be stale. See [docs/MONGO_AUTH_SETUP.md](docs/MONGO_AUTH_SETUP.md) for the reset and diagnosis flow.

## Hugging Face Integration

The model repo for this project is:

```text
https://huggingface.co/saksham0510/formai-tinyllama
```

That URL identifies the model, not necessarily the backend API endpoint. The backend expects `HUGGINGFACE_API_URL` to point to a deployed inference endpoint or Hugging Face Space API, with `HUGGINGFACE_API_PATH=/generate` when the endpoint uses a route path.

Read [hugging_face.md](hugging_face.md) for the model overview, request contract, response shape, and troubleshooting notes.

## Deployment Notes

- AWS backend deployment should use Atlas through `MONGODB_URL`.
- Local Docker development should use `DOCKER_MONGODB_URL`.
- Do not set `RUNNING_IN_DOCKER=true` on AWS unless the backend is intentionally running inside the local-style Compose network.
- Set `ALLOWED_ORIGINS` and `APP_BASE_URL` to the deployed frontend URL.
- Use production Clerk, Resend, MongoDB, and Hugging Face credentials for production deployments.

## Security Notes

- Never commit `.env`, `.env.local`, API keys, MongoDB passwords, Clerk keys, Resend keys, or Hugging Face tokens.
- Rotate any key that was pasted into chat, logs, screenshots, or committed files.
- Keep `mongo-express` for local debugging only.
- Prefer Atlas network allowlists or private networking for production MongoDB access.
