# Multi-Bot System Guide

## 📋 Overview

This system uses **5 separate Telegram bots** for different roles to improve security, organization, and user experience.

## 🤖 Bot Roles

### 1. **Client Bot** (`CLIENT_BOT_TOKEN`)
**Purpose:** Customer-facing bot for placing orders

**Features:**
- Registration with phone number
- Web App for browsing products
- Order status notifications
- Order history

**Users:** All customers (role: `CLIENT`)

### 2. **Admin Bot** (`ADMIN_BOT_TOKEN`)
**Purpose:** Administrative oversight and statistics

**Features:**
- View all new orders (info only)
- `/stats` command for system statistics
- Monitor system activity
- Link to admin panel

**Users:** System administrators (role: `ADMIN`)

### 3. **Receiver Bot** (`RECEIVER_BOT_TOKEN`)
**Purpose:** Accept or reject incoming orders

**Features:**
- Receive new order notifications
- Accept/Reject buttons for each order
- Notify pickers after acceptance
- View order details

**Users:** Order receivers (role: `ORDER_RECEIVER`, `ADMIN`)

### 4. **Picker Bot** (`PICKER_BOT_TOKEN`)
**Purpose:** Pick and prepare orders

**Features:**
- Receive accepted orders
- Start picking button
- Finish picking button
- Notify couriers when ready

**Users:** Warehouse pickers (role: `ORDER_PICKER`, `ADMIN`)

### 5. **Courier Bot** (`COURIER_BOT_TOKEN`)
**Purpose:** Deliver orders to customers

**Features:**
- Receive ready orders
- Start delivery button
- Complete delivery button
- View delivery address

**Users:** Delivery couriers (role: `COURIER`, `ADMIN`)

## 🔄 Order Flow

```
1. CUSTOMER (Client Bot)
   └─> Places order through Web App
   
2. ADMINS (Admin Bot)
   └─> Receive notification (info only)
   
3. RECEIVERS (Receiver Bot)
   └─> Receive notification with Accept/Reject buttons
   └─> Click "Accept" button
   
4. PICKERS (Picker Bot)
   └─> Receive notification about accepted order
   └─> Click "Start Picking"
   └─> Pick items from warehouse
   └─> Click "Finish Picking"
   
5. COURIERS (Courier Bot)
   └─> Receive notification about ready order
   └─> Click "Start Delivery"
   └─> Deliver to customer
   └─> Click "Complete Delivery"
   
6. CUSTOMER (Client Bot)
   └─> Receives status updates at each step
   └─> Gets final completion notification
```

## 🚀 Setup Instructions

### Step 1: Create Bots

Create 5 separate bots through [@BotFather](https://t.me/BotFather):

```
1. Client Bot
   Name: "YourCompany Orders"
   Username: @yourcompany_orders_bot
   
2. Admin Bot
   Name: "YourCompany Admin"
   Username: @yourcompany_admin_bot
   
3. Receiver Bot
   Name: "YourCompany Receiver"
   Username: @yourcompany_receiver_bot
   
4. Picker Bot
   Name: "YourCompany Picker"
   Username: @yourcompany_picker_bot
   
5. Courier Bot
   Name: "YourCompany Courier"
   Username: @yourcompany_courier_bot
```

### Step 2: Configure Environment

Copy `.env.example` to `.env` and add all 5 bot tokens:

```env
CLIENT_BOT_TOKEN=123456789:ABC...
ADMIN_BOT_TOKEN=987654321:DEF...
RECEIVER_BOT_TOKEN=111222333:GHI...
PICKER_BOT_TOKEN=444555666:JKL...
COURIER_BOT_TOKEN=777888999:MNO...
```

### Step 3: Assign User Roles

Users must have the correct role in the database to use each bot:

```sql
-- Make user an admin
UPDATE users SET role = 'ADMIN' WHERE telegram_id = '123456789';

-- Make user an order receiver
UPDATE users SET role = 'ORDER_RECEIVER' WHERE telegram_id = '987654321';

-- Make user an order picker
UPDATE users SET role = 'ORDER_PICKER' WHERE telegram_id = '111222333';

-- Make user a courier
UPDATE users SET role = 'COURIER' WHERE telegram_id = '444555666';

-- Customers are automatically created as 'CLIENT'
```

### Step 4: Start Server

```bash
npm run dev
```

All 5 bots will initialize automatically.

## 👥 User Management

### Adding New Staff

1. Ask the person to send `/start` to their designated bot
2. Get their Telegram ID from the bot logs or database
3. Update their role in the database:

```sql
-- Add as receiver
INSERT INTO users (telegram_id, name, role) 
VALUES ('123456789', 'John Doe', 'ORDER_RECEIVER');

-- Or update existing user
UPDATE users SET role = 'ORDER_RECEIVER' WHERE telegram_id = '123456789';
```

### Role Hierarchy

- `ADMIN` - Can use ALL bots (full access)
- `ORDER_RECEIVER` - Can only use Receiver Bot
- `ORDER_PICKER` - Can only use Picker Bot
- `COURIER` - Can only use Courier Bot
- `CLIENT` - Can only use Client Bot

## 🔒 Security Benefits

1. **Separation of Concerns:** Each role only sees relevant information
2. **Access Control:** Users can only interact with their designated bot
3. **Audit Trail:** Each action is logged with user ID and role
4. **Scalability:** Easy to add more role-specific features
5. **Independence:** One bot failure doesn't affect others

## 📊 Monitoring

### Admin Bot Commands

- `/start` - Show admin panel link
- `/stats` - View system statistics

### Bot Health Check

Check if all bots are running:

```bash
# Server logs show initialization status
✅ Client Bot initialized successfully
✅ Admin Bot initialized successfully
✅ Receiver Bot initialized successfully
✅ Picker Bot initialized successfully
✅ Courier Bot initialized successfully
```

## 🛠️ Troubleshooting

### Bot Not Responding

1. Check if token is correct in `.env`
2. Check server logs for errors
3. Verify bot is not blocked by user
4. Restart server: `npm run dev`

### User Can't Access Bot

1. Verify user role in database:
   ```sql
   SELECT telegram_id, name, role FROM users WHERE telegram_id = 'USER_ID';
   ```

2. Make sure user sent `/start` to correct bot
3. Check bot token is configured

### Notifications Not Sent

1. Check bot initialization logs
2. Verify user has `telegramId` in database
3. Check for errors in server logs
4. Test with `/start` command

## 📝 Best Practices

1. **Keep Tokens Secret:** Never commit `.env` to git
2. **Regular Backups:** Backup database regularly
3. **Monitor Logs:** Check server logs for errors
4. **User Training:** Train staff on their specific bot
5. **Role Assignment:** Assign roles carefully based on responsibilities

## 🔗 Related Files

- `backend/src/controllers/clientBot.js` - Client bot logic
- `backend/src/controllers/adminBot.js` - Admin bot logic
- `backend/src/controllers/receiverBot.js` - Receiver bot logic
- `backend/src/controllers/pickerBot.js` - Picker bot logic
- `backend/src/controllers/courierBot.js` - Courier bot logic
- `backend/src/index.js` - Bot initialization
- `backend/ENV_SETUP.md` - Environment setup guide

## 🎯 Future Enhancements

Possible improvements:
- Web admin panel for role management
- Bot analytics and metrics
- Custom notifications per user
- Shift management for pickers/couriers
- Order assignment algorithm
- Real-time location tracking

