# CEFR Ready

A full-stack application with Next.js frontend and Drizzle ORM backend with PostgreSQL.

## Project Structure

```
cefr-ready/
├── frontend/     # Next.js application
├── backend/      # Drizzle ORM with PostgreSQL
└── package.json  # Root workspace configuration
```

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `backend/.env.example` to `backend/.env`
   - Update the database connection string

3. Run database migrations:
   ```bash
   npm run db:push
   ```

## Development

Run both frontend and backend:
```bash
npm run dev
```

Run individually:
```bash
npm run frontend  # Next.js on port 3000
npm run backend   # API server on port 3001
```

## Database Management

- `npm run db:generate` - Generate migrations
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema changes directly
- `npm run db:studio` - Open Drizzle Studio
