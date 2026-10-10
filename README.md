# CEFR Ready

Free online CEFR practice tests (A1–C2) for Thai students, built as a single Next.js app with PostgreSQL (Drizzle ORM).

## Project Structure

```
cefr-ready/
├── src/
│   ├── app/        # Next.js App Router pages and API routes (api/, admin/, tests/, ...)
│   ├── lib/        # Shared logic: auth, rate limiting, AI (OpenRouter), scoring, verb banks
│   ├── db/         # Drizzle schema and DB client
│   └── components/ # UI components
├── drizzle/        # SQL migrations
├── scripts/        # Seed and maintenance scripts (tsx)
└── public/         # Static assets
```

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Upstash Redis credentials (rate limiting and runtime settings)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env` (or `.env.local`)
   - Set the database connection string and the other values listed in `.env.example`

3. Apply the database schema:
   ```bash
   npm run db:push
   ```

## Development

```bash
npm run dev     # Next.js dev server on http://localhost:3000
```

## Scripts

- `npm run build` - Production build
- `npm run start` - Start the production server
- `npm run lint` - ESLint on `src/`
- `npm run test:unit` - Vitest unit tests
- `npm run test:watch` - Vitest in watch mode
- `npm test` - Runs `next build` (not the unit tests)

## Database Management

- `npm run db:generate` - Generate migrations from schema changes
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema changes directly
- `npm run db:studio` - Open Drizzle Studio

## Admin

See [ADMIN_SETUP.md](ADMIN_SETUP.md) for the admin panel and AI setup.
