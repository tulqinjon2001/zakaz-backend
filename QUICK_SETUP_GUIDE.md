# Tezkor Sozlash (Test Uchun)

## 📱 Test Foydalanuvchi Ma'lumotlari

- **Telefon:** +998991140999
- **Chat ID:** 7184742980
- **Rol:** ADMIN (barcha botlarga kirish)

## 🚀 1-Qadam: Database'ni Sozlash

PostgreSQL'ga kiring va quyidagi buyruqni bajaring:

```sql
-- Test adminni yaratish/yangilash
INSERT INTO users ("telegramId", name, phone, role, "createdAt", "updatedAt")
VALUES ('7184742980', 'Test Admin', '+998991140999', 'ADMIN', NOW(), NOW())
ON CONFLICT ("telegramId") DO UPDATE
SET name = 'Test Admin',
    phone = '+998991140999',
    role = 'ADMIN',
    "updatedAt" = NOW();
```

Yoki oddiy usul:

```sql
-- Barcha foydalanuvchilarni o'chirish
DELETE FROM users;

-- Faqat test adminni qo'shish
INSERT INTO users ("telegramId", name, phone, role)
VALUES ('7184742980', 'Test Admin', '+998991140999', 'ADMIN');
```

## ✅ 2-Qadam: Tekshirish

```sql
SELECT * FROM users WHERE "telegramId" = '7184742980';
```

Natija:

```
id | telegramId   | name       | phone          | role
---|--------------|------------|----------------|-------
1  | 7184742980   | Test Admin | +998991140999  | ADMIN
```

## 🤖 3-Qadam: Botlarni Test Qilish

Har bir botga `/start` yuboring:

### 1. Client Bot

```
/start
```

Natija: Telefon raqam so'raladi (Siz allaqachon database'dasiz, lekin bot tekshiradi)

### 2. Admin Bot

```
/start
```

Natija: "Salom, Test Admin! Siz adminsiz."

### 3. Receiver Bot

```
/start
```

Natija: "Salom, Test Admin! Siz buyurtma qabul qiluvchisiz."

### 4. Picker Bot

```
/start
```

Natija: "Salom, Test Admin! Siz buyurtma yig'uvchisiz."

### 5. Courier Bot

```
/start
```

Natija: "Salom, Test Admin! Siz kuryersiz."

**Eslatma:** ADMIN roli barcha botlarga kirish imkonini beradi!

## 📦 4-Qadam: Test Buyurtma

1. Client Bot'ga `/start` yuboring
2. Web App tugmasini bosing
3. Mahsulot tanlang va buyurtma bering
4. Barcha botlardan xabar olasiz:
   - ✅ Admin Bot: Ma'lumot
   - ✅ Receiver Bot: Qabul qilish/Bekor qilish tugmalari
   - ✅ Picker Bot: (Receiver qabul qilgandan keyin)
   - ✅ Courier Bot: (Picker yakunlagandan keyin)
   - ✅ Client Bot: Holat yangilanishlari

## 🔄 5-Qadam: Buyurtma Oqimini Test Qilish

### Receiver Bot'da:

1. Yangi buyurtma xabari keladi
2. "✅ Tasdiqlash" tugmasini bosing
3. Picker Bot'ga xabar boradi

### Picker Bot'da:

1. "🔄 Yig'ishni boshlash" tugmasini bosing
2. "✅ Yig'ishni yakunlash" tugmasini bosing
3. Courier Bot'ga xabar boradi

### Courier Bot'da:

1. "🚚 Dostavkani boshlash" tugmasini bosing
2. "✅ Dostavkani yakunlash" tugmasini bosing
3. Client Bot'ga yakuniy xabar boradi

## 📊 Statistika Ko'rish

Admin Bot'da:

```
/stats
```

Natija:

```
📊 Tizim statistikasi

📦 Buyurtmalar:
  • Jami: 5
  • Kutilmoqda: 2
  • Yakunlangan: 3

👥 Foydalanuvchilar: 10
📦 Mahsulotlar: 50
🏪 Do'konlar: 3
```

## 🛠️ Muammolarni Hal Qilish

### Bot javob bermayapti?

1. Chat ID to'g'ri ekanini tekshiring:

```sql
SELECT "telegramId", name FROM users WHERE "telegramId" = '7184742980';
```

2. Serverni qayta ishga tushiring:

```bash
npm run dev
```

3. Bot loglarini tekshiring:

```
✅ Client Bot initialized successfully
✅ Admin Bot initialized successfully
✅ Receiver Bot initialized successfully
✅ Picker Bot initialized successfully
✅ Courier Bot initialized successfully
```

### Xabarlar kelmayapti?

1. Botni block qilmagan bo'lsangiz:

   - Har bir botga `/start` yuboring

2. Database'da mavjud ekanini tekshiring:

```sql
SELECT * FROM users WHERE "telegramId" = '7184742980';
```

3. Rol to'g'ri ekanini tekshiring (ADMIN bo'lishi kerak):

```sql
UPDATE users SET role = 'ADMIN' WHERE "telegramId" = '7184742980';
```

## 👥 Keyinchalik Xodimlarni Qo'shish

Test tugagach, haqiqiy xodimlarni qo'shish uchun:

```sql
-- Yangi xodimni qo'shish
INSERT INTO users ("telegramId", name, phone, role)
VALUES
('123456789', 'Alisher Qabul Qiluvchi', '+998901234567', 'ORDER_RECEIVER'),
('987654321', 'Bekzod Yiguvchi', '+998907654321', 'ORDER_PICKER'),
('555555555', 'Davron Kuryer', '+998905555555', 'COURIER');
```

Yoki bitta-bitta:

```sql
-- Receiver qo'shish
INSERT INTO users ("telegramId", name, phone, role)
VALUES ('TELEGRAM_ID', 'Ism Familiya', '+998XXXXXXXXX', 'ORDER_RECEIVER');

-- Picker qo'shish
INSERT INTO users ("telegramId", name, phone, role)
VALUES ('TELEGRAM_ID', 'Ism Familiya', '+998XXXXXXXXX', 'ORDER_PICKER');

-- Courier qo'shish
INSERT INTO users ("telegramId", name, phone, role)
VALUES ('TELEGRAM_ID', 'Ism Familiya', '+998XXXXXXXXX', 'COURIER');
```

## 🎯 Telegram ID Qanday Topish?

1. Xodimdan o'z botiga `/start` yuborishni so'rang
2. Server loglarida ko'ring:

```
User ID: 123456789, Name: Alisher
```

3. Yoki [@userinfobot](https://t.me/userinfobot)dan foydalaning

## ✅ Tayyor!

Endi barcha xabarlar sizning raqamingizga keladi va siz butun tizimni test qila olasiz!
