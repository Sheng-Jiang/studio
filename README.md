# FlashTest - Learning Platform

A modern flashcard learning platform built with Next.js, TypeScript, and Prisma.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration.

4. Set up the database:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   
   # Seed the database with sample data
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Database Management

This project uses SQLite with Prisma ORM. Available database commands:

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database and run migrations

### Health Check

Visit `/api/health` to check the application and database status.

### Testing Database

Run the database test script:
```bash
npx tsx scripts/test-db.ts
```
