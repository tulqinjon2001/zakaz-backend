# 🤖 Multi-Bot System

Bu loyihada **5 ta alohida Telegram bot** ishlaydi. Har biri o'z vazifasiga javobgar.

## 📱 Botlar Ro'yxati

| Bot | Vazifasi | Foydalanuvchilar |
|-----|----------|-----------------|
| **Client Bot** | Buyurtma berish | Mijozlar |
| **Admin Bot** | Tizimni boshqarish | Adminlar |
| **Receiver Bot** | Buyurtmani qabul qilish/rad etish | Qabul qiluvchilar |
| **Picker Bot** | Buyurtmani yig'ish | Yig'uvchilar |
| **Courier Bot** | Buyurtmani yetkazish | Kuryerlar |

## 🔄 Buyurtma Oqimi

```
MIJOZ (Client Bot)
  └─> Buyurtma beradi
       ↓
ADMIN (Admin Bot)  
  └─> Ko'rib turadi (faqat ma'lumot)
       ↓
QABUL QILUVCHI (Receiver Bot)
  └─> Qabul qiladi yoki rad etadi
       ↓
YIG'UVCHI (Picker Bot)
  └─> Mahsulotlarni yig'adi
       ↓
KURYER (Courier Bot)
  └─> Mijozga yetkazib beradi
       ↓
MIJOZ (Client Bot)
  └─> Xabar oladi ✅
```

## 🚀 O'rnatish

### 1. Botlarni yaratish

[@BotFather](https://t.me/BotFather) orqali 5 ta bot yarating:

```
/newbot
Nom: "Zakaz Client"
Username: zakaz_client_bot

/newbot
Nom: "Zakaz Admin"
Username: zakaz_admin_bot

/newbot
Nom: "Zakaz Receiver"
Username: zakaz_receiver_bot

/newbot
Nom: "Zakaz Picker"
Username: zakaz_picker_bot

/newbot
Nom: "Zakaz Courier"
Username: zakaz_courier_bot
```

### 2. .env faylni sozlash

`.env` fayliga tokenlarni qo'shing:

```env
CLIENT_BOT_TOKEN=123456:ABC...
ADMIN_BOT_TOKEN=789012:DEF...
RECEIVER_BOT_TOKEN=345678:GHI...
PICKER_BOT_TOKEN=901234:JKL...
COURIER_BOT_TOKEN=567890:MNO...
```

### 3. Serverni ishga tushirish

```bash
npm run dev
```

### 4. Rollarni belgilash

```sql
-- Admin qilish
UPDATE users SET role = 'ADMIN' WHERE telegram_id = '123456789';

-- Qabul qiluvchi qilish
UPDATE users SET role = 'ORDER_RECEIVER' WHERE telegram_id = '987654321';

-- Yig'uvchi qilish
UPDATE users SET role = 'ORDER_PICKER' WHERE telegram_id = '111222333';

-- Kuryer qilish
UPDATE users SET role = 'COURIER' WHERE telegram_id = '444555666';
```

## ✅ Test Qilish

Har bir bot bilan `/start` yuborish orqali test qiling:

1. ✅ Client Bot - mijoz sifatida
2. ✅ Admin Bot - admin sifatida
3. ✅ Receiver Bot - qabul qiluvchi sifatida
4. ✅ Picker Bot - yig'uvchi sifatida
5. ✅ Courier Bot - kuryer sifatida

## 📚 Batafsil Ma'lumot

- **MULTI_BOT_GUIDE.md** - To'liq qo'llanma
- **MULTI_BOT_MIGRATION.md** - Eski versiyadan o'tish
- **ENV_SETUP.md** - Environment sozlamalari

## 🆘 Yordam

### Bot javob bermayapti?

1. `.env` da token to'g'ri yozilganini tekshiring
2. Serverni qayta ishga tushiring: `npm run dev`
3. Foydalanuvchi botni block qilmaganini tekshiring

### Foydalanuvchi botga kira olmayapti?

1. Database da rolini tekshiring:
   ```sql
   SELECT role FROM users WHERE telegram_id = 'USER_ID';
   ```
2. Rol to'g'ri bo'lsa, `/start` yuborsin

### Bildirishnomalar kelmayapti?

1. Server loglarini tekshiring
2. Bot ishga tushganini tasdiqlang
3. Telegram ID to'g'ri yozilganini tekshiring

## 🎯 Afzalliklar

✅ **Xavfsizlik** - Har bir rol faqat o'z botidan foydalanadi  
✅ **Tartib** - Vazifalar aniq bo'lingan  
✅ **Miqyoslilik** - Oson kengaytirish mumkin  
✅ **Foydalanuvchi tajribasi** - Har bir rol uchun maxsus interfeys  
✅ **Ta'mirlash oson** - Modular tuzilma  

---

**Muallif:** Zakaz Bot Team  
**Versiya:** 2.0 (Multi-Bot)  
**Sana:** 2026

