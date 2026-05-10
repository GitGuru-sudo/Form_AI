# Next Steps for FormAI

To get FormAI running locally on your machine, follow these steps:

## 1. Setup Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory by copying `.env.example`.

You must provide:
- `MONGODB_URL`: Your local MongoDB string or Atlas URL.
- `CLERK_SECRET_KEY`: Get this from your [Clerk Dashboard](https://dashboard.clerk.com/).
- `CLERK_PUBLISHABLE_KEY`: Same as above.
- `HUGGINGFACE_API_URL`: Your FormAI Space URL.
- `HUGGINGFACE_API_PATH`: Set this to `/generate` for your form generation endpoint.
- `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_APP_PASSWORD`: Required if you use Docker Compose for MongoDB.
- `ME_CONFIG_BASICAUTH_USERNAME`, `ME_CONFIG_BASICAUTH_PASSWORD`: Required only if you want `mongo-express`.

Keep `backend/.env` local only. Do not commit it.

### Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend/` directory by copying `env.local.example`.

You must provide:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: From Clerk.
- `CLERK_SECRET_KEY`: From Clerk.
- `NEXT_PUBLIC_API_URL`: Set to `http://localhost:8000`.

Keep `frontend/.env.local` local only. Do not commit it.

## 2. Install Dependencies

In the root directory, run:

```bash
# Frontend
cd frontend
npm install --legacy-peer-deps

# Backend
cd ../backend
npm install
```

## 3. Run FormAI

Open two terminals:

### Terminal 1 (Backend)

```bash
cd backend
npm run dev
```

### Terminal 2 (Frontend)

```bash
cd frontend
npm run dev
```

## 4. Testing the Flow

1. Go to `http://localhost:3000`.
2. Sign up or sign in via Clerk.
3. Describe a form you want, for example `Customer satisfaction survey`.
4. Preview the generated form and publish it.
5. Open the public link in an incognito window to fill it out.
6. Check your dashboard to see the responses.

## Optional: Docker

If you have Docker installed, you can start the database using:

```bash
docker compose up -d mongo
```

If you also want `mongo-express`, start it explicitly:

```bash
docker compose --profile debug up -d mongo-express
```
