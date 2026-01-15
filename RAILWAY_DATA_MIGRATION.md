# Local Database'dan Railway'ga Ma'lumotlarni Ko'chirish

## Usul 1: pg_dump va psql (Eng Oson va Ishonchli)

### Step 1: Local Database'dan Dump Olish

```bash
# Windows PowerShell'da:
pg_dump -h localhost -U postgres -d mini_bot -F c -f backup.dump

# Yoki SQL format'da:
pg_dump -h localhost -U postgres -d mini_bot -f backup.sql
```

**Eslatma:** Agar parol so'ralsa, `postgres` foydalanuvchisi parolini kiriting.

### Step 2: Railway Database'ga Yuklash

#### Variant A: Dump fayl orqali (Binary format)

```bash
# Railway database'ga restore qilish:
pg_restore -h yamabiko.proxy.rlwy.net -p 22469 -U postgres -d railway -c backup.dump
```

#### Variant B: SQL fayl orqali

```bash
# Railway database'ga SQL faylni yuklash:
psql -h yamabiko.proxy.rlwy.net -p 22469 -U postgres -d railway -f backup.sql
```

**Parol:** `cVQztGIviTnYeipZZiVAyhWdUWLXUcLv`

### Step 3: Environment Variable orqali (Osonroq)

Parolni har safar kiritmaslik uchun environment variable ishlatishingiz mumkin:

**Windows PowerShell:**
```powershell
$env:PGPASSWORD="cVQztGIviTnYeipZZiVAyhWdUWLXUcLv"
pg_dump -h localhost -U postgres -d mini_bot -f backup.sql
psql -h yamabiko.proxy.rlwy.net -p 22469 -U postgres -d railway -f backup.sql
```

## Usul 2: Prisma Studio orqali (Kichik Ma'lumotlar uchun)

Agar ma'lumotlar kam bo'lsa, Prisma Studio orqali qo'lda ko'chirish mumkin:

1. **Local database'ni ochish:**
   ```bash
   # .env faylida local DATABASE_URL ni qo'yib:
   npm run prisma:studio
   ```

2. **Railway database'ni ochish:**
   ```bash
   # .env faylida Railway DATABASE_URL ni qo'yib:
   npm run prisma:studio
   ```

3. **Ma'lumotlarni qo'lda ko'chirish** (har bir jadval uchun)

## Usul 3: Node.js Script orqali (Avtomatik)

Avtomatik ko'chirish script'i mavjud: `scripts/migrate-to-railway.js`

### Step 1: .env faylida LOCAL_DATABASE_URL qo'shing

```env
# Local database (ma'lumotlarni olish uchun)
LOCAL_DATABASE_URL="postgresql://postgres:tulqin@localhost:5432/mini_bot?schema=public"

# Railway database (ma'lumotlarni yuklash uchun)
DATABASE_URL="postgresql://postgres:cVQztGIviTnYeipZZiVAyhWdUWLXUcLv@yamabiko.proxy.rlwy.net:22469/railway?schema=public"
```

### Step 2: Script'ni ishga tushiring

```bash
cd backend
npm run migrate:to-railway
```

Bu script barcha jadvallarni (Users, Stores, Categories, Products, Inventories, Orders) avtomatik ko'chiradi.

## Troubleshooting

### SSL Connection Error

Agar SSL xatosi bo'lsa, connection string'ga `?sslmode=require` qo'shing yoki:

```bash
psql "postgresql://postgres:cVQztGIviTnYeipZZiVAyhWdUWLXUcLv@yamabiko.proxy.rlwy.net:22469/railway?sslmode=require" -f backup.sql
```

### Permission Error

Agar permission xatosi bo'lsa, `-c` (clean) flag'ini olib tashlang:

```bash
pg_restore -h yamabiko.proxy.rlwy.net -p 22469 -U postgres -d railway backup.dump
```

### Connection Timeout

Agar connection timeout bo'lsa, Railway dashboard'da database'ga tashqi ulanishga ruxsat berilganligini tekshiring.

