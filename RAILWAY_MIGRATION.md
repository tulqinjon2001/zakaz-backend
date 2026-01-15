# Railway Database Migration Guide

## Step 1: Update .env File

`backend/.env` faylida `DATABASE_URL` ni quyidagicha o'zgartiring:

```env
DATABASE_URL="postgresql://postgres:cVQztGIviTnYeipZZiVAyhWdUWLXUcLv@yamabiko.proxy.rlwy.net:22469/railway?schema=public"
```

## Step 2: Generate Prisma Client

```bash
cd backend
npm run prisma:generate
```

## Step 3: Run Migration

Agar database bo'sh bo'lsa (yangi database):

```bash
npm run prisma:migrate
```

Agar database'da jadval mavjud bo'lsa va faqat yangilash kerak bo'lsa:

```bash
npx prisma migrate deploy
```

## Step 4: Verify Connection

Serverni ishga tushiring:

```bash
npm run dev
```

Agar muvaffaqiyatli ulanib bo'lsa, server ishga tushadi.

## Troubleshooting

### SSL Connection Error

Agar SSL xatosi bo'lsa, URL'ga `sslmode=require` qo'shing:

```env
DATABASE_URL="postgresql://postgres:cVQztGIviTnYeipZZiVAyhWdUWLXUcLv@yamabiko.proxy.rlwy.net:22469/railway?schema=public&sslmode=require"
```

### Connection Pool Error

Agar connection pool xatosi bo'lsa, Prisma schema'ga connection pool sozlamalarini qo'shing:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  directUrl = env("DATABASE_URL")
}
```

