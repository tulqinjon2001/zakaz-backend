# Multi-Bot System Migration Guide

## 🔄 What Changed?

The system has been migrated from a **single bot** architecture to a **multi-bot** architecture with 5 separate bots for different roles.

## 📂 New File Structure

### New Bot Controllers Created:

```
backend/src/controllers/
├── clientBot.js         ✨ NEW - Customer bot
├── adminBot.js          ✨ NEW - Admin bot  
├── receiverBot.js       ✨ NEW - Order receiver bot
├── pickerBot.js         ✨ NEW - Order picker bot
├── courierBot.js        ✨ NEW - Courier bot
└── botController.js     ⚠️  DEPRECATED - Old unified bot
```

### Modified Files:

```
backend/
├── src/
│   ├── index.js                    ✏️  UPDATED - Initializes all 5 bots
│   ├── controllers/
│   │   └── orderController.js      ✏️  UPDATED - Uses new notification functions
│   └── routes/
│       └── botRoutes.js            ✏️  UPDATED - Multi-bot status endpoint
├── ENV_SETUP.md                    ✏️  UPDATED - Added 5 bot tokens
├── MULTI_BOT_GUIDE.md              ✨ NEW - Complete usage guide
└── MULTI_BOT_MIGRATION.md          ✨ NEW - This file
```

## 🔑 Key Changes

### 1. Environment Variables

**Before:**
```env
BOT_TOKEN=your_single_bot_token
ADMIN_CHAT_ID=your_chat_id
```

**After:**
```env
CLIENT_BOT_TOKEN=your_client_bot_token
ADMIN_BOT_TOKEN=your_admin_bot_token
RECEIVER_BOT_TOKEN=your_receiver_bot_token
PICKER_BOT_TOKEN=your_picker_bot_token
COURIER_BOT_TOKEN=your_courier_bot_token
```

### 2. Bot Initialization

**Before:**
```javascript
import { initBot } from './controllers/botController.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (BOT_TOKEN) {
  initBot(BOT_TOKEN);
}
```

**After:**
```javascript
import { initClientBot } from './controllers/clientBot.js';
import { initAdminBot } from './controllers/adminBot.js';
import { initReceiverBot } from './controllers/receiverBot.js';
import { initPickerBot } from './controllers/pickerBot.js';
import { initCourierBot } from './controllers/courierBot.js';

// Initialize all 5 bots
initClientBot(process.env.CLIENT_BOT_TOKEN);
initAdminBot(process.env.ADMIN_BOT_TOKEN);
initReceiverBot(process.env.RECEIVER_BOT_TOKEN);
initPickerBot(process.env.PICKER_BOT_TOKEN);
initCourierBot(process.env.COURIER_BOT_TOKEN);
```

### 3. Notification System

**Before:**
```javascript
import { notifyAdmin } from './botController.js';

// Single notification to admin
await notifyAdmin(orderData);
```

**After:**
```javascript
import { notifyAdmins } from './adminBot.js';
import { notifyReceivers } from './receiverBot.js';

// Separate notifications
await notifyAdmins(orderData);     // Info to admins
await notifyReceivers(orderData);  // Action buttons to receivers
```

### 4. Bot Status API

**Before:**
```bash
GET /api/bot/status
Response:
{
  "status": "active",
  "message": "Bot is running"
}
```

**After:**
```bash
GET /api/bot/status
Response:
{
  "bots": {
    "client": "active",
    "admin": "active",
    "receiver": "active",
    "picker": "active",
    "courier": "active"
  },
  "allActive": true,
  "message": "Multi-bot system status"
}
```

## 🚀 Migration Steps

### For Existing Projects:

#### Step 1: Create 5 New Bots

Go to [@BotFather](https://t.me/BotFather) and create:
1. Client Bot (for customers)
2. Admin Bot (for admins)
3. Receiver Bot (for order receivers)
4. Picker Bot (for order pickers)
5. Courier Bot (for couriers)

#### Step 2: Update Environment Variables

Update your `.env` file:

```env
# Remove old variable
# BOT_TOKEN=...          ❌ REMOVE

# Add new variables
CLIENT_BOT_TOKEN=...     ✅ ADD
ADMIN_BOT_TOKEN=...      ✅ ADD
RECEIVER_BOT_TOKEN=...   ✅ ADD
PICKER_BOT_TOKEN=...     ✅ ADD
COURIER_BOT_TOKEN=...    ✅ ADD
```

#### Step 3: Restart Server

```bash
npm run dev
```

You should see:

```
🤖 Initializing Telegram Bots...

✅ Client Bot initialized successfully
✅ Admin Bot initialized successfully
✅ Receiver Bot initialized successfully
✅ Picker Bot initialized successfully
✅ Courier Bot initialized successfully

✅ All bots initialization completed!
```

#### Step 4: Update User Roles

Make sure users have correct roles in database:

```sql
-- Check current roles
SELECT telegram_id, name, role FROM users;

-- Update roles as needed
UPDATE users SET role = 'ORDER_RECEIVER' WHERE telegram_id = 'xxx';
UPDATE users SET role = 'ORDER_PICKER' WHERE telegram_id = 'yyy';
UPDATE users SET role = 'COURIER' WHERE telegram_id = 'zzz';
UPDATE users SET role = 'ADMIN' WHERE telegram_id = 'aaa';
```

#### Step 5: Test Each Bot

Have team members test their respective bots:

1. **Customers** → Send `/start` to Client Bot
2. **Admins** → Send `/start` to Admin Bot
3. **Receivers** → Send `/start` to Receiver Bot
4. **Pickers** → Send `/start` to Picker Bot
5. **Couriers** → Send `/start` to Courier Bot

## ⚠️ Important Notes

### Database Schema (No Changes Required)

The database schema **remains the same**. The user `role` field already supports all needed roles:
- `CLIENT`
- `ADMIN`
- `ORDER_RECEIVER`
- `ORDER_PICKER`
- `COURIER`

No migration needed! ✅

### Old Bot Controller

The old `botController.js` file is now **deprecated** but kept for reference. It's no longer used in the system.

You can safely **ignore or remove** it after confirming the new system works.

### Backward Compatibility

The new system is **not backward compatible** with single-bot setup. You **must** provide all 5 bot tokens for the system to work properly.

If some tokens are missing, those specific bots won't work, but others will continue functioning.

## 🎯 Benefits of Multi-Bot System

### 1. **Security**
- Each role only has access to their bot
- Reduced risk of unauthorized actions
- Better audit trail

### 2. **Organization**
- Clear separation of responsibilities
- Role-specific interfaces
- Easier to train staff

### 3. **Scalability**
- Easy to add role-specific features
- Independent bot updates
- Better performance (distributed load)

### 4. **User Experience**
- Cleaner interface per role
- Relevant commands only
- No confusion with mixed responsibilities

### 5. **Maintainability**
- Modular code structure
- Easier debugging
- Independent testing per role

## 📊 Comparison

| Feature | Old System | New System |
|---------|-----------|------------|
| Number of Bots | 1 | 5 |
| Access Control | Role-based in single bot | Separate bot per role |
| Notifications | Mixed in one chat | Targeted per role |
| Code Structure | Single file | Modular files |
| Scalability | Limited | High |
| Security | Basic | Enhanced |
| User Experience | Mixed interface | Role-specific |

## 🐛 Troubleshooting

### Problem: Bot not responding

**Solution:** Check if token is configured in `.env`:

```bash
# Check environment variables
cat .env | grep BOT_TOKEN
```

### Problem: User gets "no permission" error

**Solution:** Verify user role in database:

```sql
SELECT * FROM users WHERE telegram_id = 'USER_TELEGRAM_ID';
```

Update role if needed:

```sql
UPDATE users SET role = 'CORRECT_ROLE' WHERE telegram_id = 'USER_TELEGRAM_ID';
```

### Problem: Notifications not sent

**Solution:** 
1. Check if bot is initialized (see server logs)
2. Verify user has `telegramId` in database
3. Check if bot is blocked by user
4. Test with `/start` command first

## 📚 Additional Resources

- See `MULTI_BOT_GUIDE.md` for detailed usage instructions
- See `ENV_SETUP.md` for environment setup
- See individual bot files for implementation details

## ✅ Checklist

Use this checklist to ensure successful migration:

- [ ] Created 5 new bots via @BotFather
- [ ] Updated `.env` with all 5 tokens
- [ ] Restarted server successfully
- [ ] All 5 bots show as initialized in logs
- [ ] Updated user roles in database
- [ ] Tested Client Bot with a customer
- [ ] Tested Admin Bot with an admin
- [ ] Tested Receiver Bot with a receiver
- [ ] Tested Picker Bot with a picker
- [ ] Tested Courier Bot with a courier
- [ ] Placed a test order and verified workflow
- [ ] All notifications working correctly

## 🎉 Success!

If all bots are initialized and working, your migration is complete! 

The system is now using a professional multi-bot architecture for better security, organization, and user experience.

