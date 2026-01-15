# PostgreSQL Database Setup Guide

## Muammo (Error)
```
Error: P1000: Authentication failed against database server at `localhost`, 
the provided database credentials for `user` are not valid.
```

Bu xato `.env` faylida noto'g'ri PostgreSQL ma'lumotlari borligini ko'rsatadi.

## Yechim (Solution)

### 1-qadam: PostgreSQL ni tekshiring

PostgreSQL server ishlab turganligini tekshiring:

**Windows PowerShell:**
```powershell
# PostgreSQL xizmatini tekshirish
Get-Service -Name postgresql*

# Agar xizmat topilmasa, PostgreSQL o'rnatilganligini tekshirish
psql --version
```

**Agar PostgreSQL o'rnatilmagan bo'lsa:**
- https://www.postgresql.org/download/windows/ dan yuklab oling va o'rnating

### 2-qadam: PostgreSQL ma'lumotlarini toping

PostgreSQL o'rnatilganida, default ma'lumotlar:
- **Username:** `postgres` (ko'pincha default)
- **Password:** PostgreSQL o'rnatish paytida kiritgan parolingiz
- **Port:** `5432` (default)
- **Host:** `localhost`

**Parolni unutgan bo'lsangiz:**
1. Windows Services (xizmatlar) ni oching
2. `postgresql-x64-XX` xizmatini toping
3. Xizmatni to'xtating
4. `pg_hba.conf` faylini toping (odatda `C:\Program Files\PostgreSQL\XX\data\`)
5. `pg_hba.conf` da `md5` ni `trust` ga o'zgartiring
6. Xizmatni qayta ishga tushiring
7. psql orqali kirib, parolni o'zgartiring
8. `pg_hba.conf` ni qaytarib, xizmatni qayta ishga tushiring

### 3-qadam: Bazani yarating

PostgreSQL ga kiring va bazani yarating:

```powershell
# PostgreSQL ga kirish (parol so'raladi)
psql -U postgres

# Bazani yaratish
CREATE DATABASE zakaz_bot;

# Chiqish
\q
```

Yoki bir qatorda:
```powershell
psql -U postgres -c "CREATE DATABASE zakaz_bot;"
```

### 4-qadam: .env faylini yangilang

`.env` faylini oching va haqiqiy ma'lumotlarni kiriting:

```env
DATABASE_URL="postgresql://postgres:SIZNING_PAROL@localhost:5432/zakaz_bot?schema=public"
PORT=3000
NODE_ENV=development
```

**Muhim:** `SIZNING_PAROL` o'rniga haqiqiy PostgreSQL parolingizni yozing.

**Parol maxsus belgilar (%, @, # va h.k.) bo'lsa, URL encoding ishlating:**
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `=` → `%3D`

**Misol:**
Agar parol `my@pass#123` bo'lsa:
```env
DATABASE_URL="postgresql://postgres:my%40pass%23123@localhost:5432/zakaz_bot?schema=public"
```

### 5-qadam: Ulanishni sinab ko'ring

```powershell
npm run prisma:migrate
```

Bu buyruq:
1. Bazaga ulanadi
2. Jadval strukturalarini yaratadi (migrations)
3. Database schema ni o'rnatadi

## Qo'shimcha yordam

Agar muammo davom etsa:

1. **PostgreSQL xizmati ishlab turganini tekshiring:**
   ```powershell
   Get-Service -Name postgresql*
   ```

2. **Port 5432 band emasligini tekshiring:**
   ```powershell
   netstat -an | findstr :5432
   ```

3. **pg_hba.conf faylini tekshiring** (authentication sozlamalari)

4. **Firewall PostgreSQL portini bloklamaganligini tekshiring**

## Alternativ: Docker PostgreSQL

Agar local PostgreSQL muammo bersa, Docker ishlatishingiz mumkin:

```powershell
# Docker PostgreSQL container ishga tushirish
docker run --name zakaz-postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=zakaz_bot -p 5432:5432 -d postgres

# .env faylida:
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/zakaz_bot?schema=public"
```

