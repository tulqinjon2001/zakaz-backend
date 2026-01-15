-- Test uchun barcha rollarni bitta foydalanuvchiga biriktirish
-- Telefon: +998991140999
-- Chat ID: 7184742980

-- Avval mavjud foydalanuvchini tekshirish
SELECT * FROM users WHERE "telegramId" = '7184742980';

-- Agar mavjud bo'lmasa, yangi foydalanuvchi yaratish
INSERT INTO users ("telegramId", name, phone, role, "createdAt", "updatedAt")
VALUES ('7184742980', 'Test Admin', '+998991140999', 'ADMIN', NOW(), NOW())
ON CONFLICT ("telegramId") DO UPDATE 
SET name = 'Test Admin', 
    phone = '+998991140999', 
    role = 'ADMIN',
    "updatedAt" = NOW();

-- Barcha rollar uchun alohida yozuvlar yaratish (test uchun)
-- Bu sizga barcha botlardan xabar olish imkonini beradi

-- 1. CLIENT roli (test uchun)
INSERT INTO users ("telegramId", name, phone, role, "createdAt", "updatedAt")
VALUES ('7184742980', 'Test Client', '+998991140999', 'CLIENT', NOW(), NOW())
ON CONFLICT ("telegramId") DO UPDATE 
SET role = 'CLIENT', "updatedAt" = NOW();

-- Yoki barcha rollarda ishlatish uchun ADMIN qoldiring:
UPDATE users 
SET role = 'ADMIN', 
    name = 'Test Admin (All Roles)', 
    phone = '+998991140999',
    "updatedAt" = NOW()
WHERE "telegramId" = '7184742980';

-- Tekshirish
SELECT id, "telegramId", name, phone, role, "createdAt" 
FROM users 
WHERE "telegramId" = '7184742980';

-- Barcha boshqa foydalanuvchilarni o'chirish (ixtiyoriy, faqat test uchun)
-- DELETE FROM users WHERE "telegramId" != '7184742980';

