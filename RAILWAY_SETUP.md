# Railway PostgreSQL Database Setup

## Database URL Configuration

Railway PostgreSQL'ga ulash uchun `backend/.env` faylida `DATABASE_URL` ni quyidagicha o'zgartiring:

```env
DATABASE_URL="postgresql://postgres:cVQztGIviTnYeipZZiVAyhWdUWLXUcLv@yamabiko.proxy.rlwy.net:22469/railway?schema=public"
```

**Muhim:** URL oxirida `?schema=public` bo'lishi shart!

## Migration Steps

1. **Prisma Client'ni generate qiling:**
   ```bash
   cd backend
   npm run prisma:generate
   ```

2. **Database migration'ni bajarish:**
   ```bash
   npm run prisma:migrate
   ```
   
   Agar migration xatosi bo'lsa, quyidagilarni bajarishingiz mumkin:
   ```bash
   npx prisma migrate deploy
   ```

3. **Database strukturasini tekshirish:**
   ```bash
   npm run prisma:studio
   ```
   
   Bu Prisma Studio'ni ochadi va database strukturasini ko'rish imkonini beradi.

## Connection Test

Serverni ishga tushirib, database ulanishini tekshiring:

```bash
npm run dev
```

Agar muvaffaqiyatli ulanib bo'lsa, server ishga tushadi va xatolar bo'lmaydi.

## Troubleshooting

Agar connection xatosi bo'lsa:

1. **SSL Connection:** Railway PostgreSQL SSL talab qilishi mumkin. URL'ga `?sslmode=require` qo'shing:
   ```env
   DATABASE_URL="postgresql://postgres:cVQztGIviTnYeipZZiVAyhWdUWLXUcLv@yamabiko.proxy.rlwy.net:22469/railway?schema=public&sslmode=require"
   ```

2. **Connection Pool:** Railway'da connection limit bo'lishi mumkin. Prisma connection pool sozlamalarini tekshiring.

3. **Network Access:** Railway database'ga tashqi ulanishga ruxsat berilganligini tekshiring.

## Production Considerations

- Railway database production uchun ishlatilganda, connection pool'ni optimallashtirish kerak
- Environment variable'larni Railway dashboard'da sozlash tavsiya etiladi
- Database backup'larini muntazam qilish kerak

