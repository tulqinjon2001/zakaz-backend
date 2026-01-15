# Changelog

## Version 2.0 - Multi-Bot System (2026-01-14)

### 🎉 Major Changes

#### Added 5 Separate Telegram Bots

Migrated from single bot to multi-bot architecture:

1. **Client Bot** (`clientBot.js`) - Customer-facing bot
   - Registration with phone number
   - Web App access
   - Order status notifications
   
2. **Admin Bot** (`adminBot.js`) - Administrative bot
   - System statistics (`/stats` command)
   - Order monitoring (info only)
   - Admin panel access
   
3. **Receiver Bot** (`receiverBot.js`) - Order acceptance bot
   - New order notifications with action buttons
   - Accept/Reject order functionality
   - Triggers picker notifications
   
4. **Picker Bot** (`pickerBot.js`) - Order picking bot
   - Pick order notifications
   - Start/Finish picking buttons
   - Triggers courier notifications
   
5. **Courier Bot** (`courierBot.js`) - Delivery bot
   - Delivery notifications
   - Start/Complete delivery buttons
   - Customer notification upon completion

### 📝 Modified Files

#### `src/index.js`
- ✅ Replaced single bot initialization with 5 bot initializations
- ✅ Added startup messages for each bot
- ✅ Improved error handling per bot

#### `src/controllers/orderController.js`
- ✅ Updated `createOrder()` to use new notification system
- ✅ Split notifications: `notifyAdmins()` + `notifyReceivers()`
- ✅ Updated `notifyStatusChange()` to use Client Bot

#### `src/routes/botRoutes.js`
- ✅ Updated `/status` endpoint to show all 5 bots
- ✅ Modified `/send-message` to support bot selection
- ✅ Changed `/notify-admin` to `/notify-order` (supports both admins and receivers)

#### Environment Files
- ✅ Updated `ENV_SETUP.md` with 5 bot token instructions
- ✅ Created `.env.example` with all required tokens

### 📚 New Documentation

- ✅ `MULTI_BOT_GUIDE.md` - Complete usage guide
- ✅ `MULTI_BOT_MIGRATION.md` - Migration instructions
- ✅ `BOTS_README.md` - Quick reference in Uzbek
- ✅ `CHANGELOG.md` - This file

### 🔧 Technical Details

#### Bot Communication Flow

```
New Order Created
    ↓
┌───┴────────────────────────────────────┐
│                                        │
Admin Bot              Receiver Bot      │
(Info only)            (Action buttons)  │
    ↓                       ↓             │
Monitors             Accept Order        │
    ↓                       ↓             │
    │                  Picker Bot         │
    │                  (Pick items)       │
    │                       ↓             │
    │                 Courier Bot         │
    │                 (Deliver)           │
    │                       ↓             │
    └───────────────> Client Bot         │
                      (Status updates) ───┘
```

#### Security Improvements

- ✅ Role-based bot access (each bot validates user role)
- ✅ Separate bot tokens (one compromised ≠ all compromised)
- ✅ Action buttons only for authorized roles
- ✅ Better audit trail (action + bot + user role)

#### Code Quality

- ✅ Modular architecture (one file per bot)
- ✅ DRY principle maintained
- ✅ Consistent error handling
- ✅ Comprehensive documentation
- ✅ No linter errors

### 🗑️ Deprecated

#### `src/controllers/botController.js`
- ⚠️  **DEPRECATED** - Old unified bot controller
- ⚠️  No longer used in the system
- ⚠️  Kept for reference only
- ⚠️  Safe to remove after confirming new system works

### ⚙️ Environment Variables

#### Removed
```env
BOT_TOKEN=...           # Old single bot token
ADMIN_CHAT_ID=...       # No longer needed
```

#### Added
```env
CLIENT_BOT_TOKEN=...    # Client bot token
ADMIN_BOT_TOKEN=...     # Admin bot token
RECEIVER_BOT_TOKEN=...  # Receiver bot token
PICKER_BOT_TOKEN=...    # Picker bot token
COURIER_BOT_TOKEN=...   # Courier bot token
ADMIN_PANEL_URL=...     # Admin panel URL (optional)
```

### 📊 Database Changes

**No database migration required!** ✅

The existing `role` field in `users` table already supports all needed roles:
- `CLIENT`
- `ADMIN`
- `ORDER_RECEIVER`
- `ORDER_PICKER`
- `COURIER`

### 🐛 Bug Fixes

- Fixed notification system to be role-specific
- Improved error handling for bot initialization failures
- Better status update notifications
- Fixed circular dependency issues in bot imports

### 🚀 Performance

- Better load distribution across 5 bots
- Reduced message processing time per bot
- Independent bot restarts possible
- Scalable architecture

### 📦 Dependencies

No new dependencies added. Still using:
- `node-telegram-bot-api@^0.66.0`
- `express@^4.19.2`
- `@prisma/client@^5.19.1`
- Other existing dependencies

### 🔄 Migration Path

1. Create 5 bots via @BotFather
2. Update `.env` with new tokens
3. Restart server
4. Assign user roles in database
5. Test each bot
6. (Optional) Remove old `botController.js`

See `MULTI_BOT_MIGRATION.md` for detailed instructions.

### ✅ Testing Checklist

- [x] All 5 bots initialize successfully
- [x] Client bot handles registration
- [x] Client bot sends Web App
- [x] Admin bot shows statistics
- [x] Receiver bot accepts/rejects orders
- [x] Picker bot starts/finishes picking
- [x] Courier bot starts/completes delivery
- [x] Client receives status updates
- [x] Role validation works
- [x] No linter errors
- [x] Documentation complete

---

## Version 1.0 - Initial Release

### Features
- Single bot for all users
- Basic order management
- Phone registration
- Web App integration
- Order status tracking

---

**Note:** This changelog follows [Keep a Changelog](https://keepachangelog.com/) format.

