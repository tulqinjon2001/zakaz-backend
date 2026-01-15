# Environment Setup

Create a `.env` file in the root directory with the following content:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/zakaz_bot?schema=public"

# Server Configuration
PORT=3000
NODE_ENV=development

# Telegram Bot Configuration - Separate bots for each role
CLIENT_BOT_TOKEN=your_client_bot_token_here
ADMIN_BOT_TOKEN=your_admin_bot_token_here
RECEIVER_BOT_TOKEN=your_receiver_bot_token_here
PICKER_BOT_TOKEN=your_picker_bot_token_here
COURIER_BOT_TOKEN=your_courier_bot_token_here

# Web App URL for clients
WEB_APP_URL=https://zakaz-web-app.vercel.app

# Admin Panel URL (optional)
ADMIN_PANEL_URL=https://zakaz-admin.vercel.app
```

## Database URL Format

Replace the placeholders in `DATABASE_URL`:
- `user`: Your PostgreSQL username
- `password`: Your PostgreSQL password
- `localhost:5432`: Your PostgreSQL host and port
- `zakaz_bot`: Your database name

Example:
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/zakaz_bot?schema=public"
```

## Setup Steps

1. Install PostgreSQL if you haven't already
2. Create a database named `zakaz_bot` (or use your preferred name)
3. Copy the `.env` file content above
4. Replace the connection details with your actual PostgreSQL credentials
5. Run `npm run prisma:migrate` to create the database tables

## Telegram Bot Setup

**IMPORTANT:** You need to create 5 separate bots for different roles:

1. **Client Bot** - For customers to place orders
2. **Admin Bot** - For system administrators  
3. **Receiver Bot** - For order receivers to accept/reject orders
4. **Picker Bot** - For warehouse workers to pick orders
5. **Courier Bot** - For couriers to deliver orders

### Creating Each Bot:

For each role, follow these steps:

1. Go to [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` command
3. Enter bot name (e.g., "Zakaz Client Bot", "Zakaz Admin Bot", etc.)
4. Enter username (e.g., "zakaz_client_bot", "zakaz_admin_bot", etc.)
5. Copy the bot token you receive
6. Add it to `.env` file with the appropriate variable name:
   - `CLIENT_BOT_TOKEN` - for customer bot
   - `ADMIN_BOT_TOKEN` - for admin bot
   - `RECEIVER_BOT_TOKEN` - for receiver bot
   - `PICKER_BOT_TOKEN` - for picker bot
   - `COURIER_BOT_TOKEN` - for courier bot

### Set Web App URL:
   - For production: Use your Vercel/Netlify URL (e.g., `https://zakaz-web-app.vercel.app`)
   - For development: Use ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Add it to `.env` as `WEB_APP_URL`

### Set Admin Panel URL (Optional):
   - Add your admin panel URL to `.env` as `ADMIN_PANEL_URL`

## How It Works

1. **Customer Flow (Client Bot):**
   - Customer sends `/start` to Client Bot
   - Bot requests phone number for registration
   - Bot sends Web App button to browse products
   - Customer places order through Web App

2. **Order Processing Flow:**
   - New order is created
   - **Admin Bot** sends notification to all admins (info only)
   - **Receiver Bot** sends notification to order receivers with Accept/Reject buttons
   - When accepted, **Picker Bot** notifies pickers to start picking
   - When picking is done, **Courier Bot** notifies couriers for delivery
   - Customer gets status updates through Client Bot

3. **Role-Based Access:**
   - Each bot only works for users with the appropriate role
   - Users interact only with their designated bot
   - Separation ensures better security and organized workflow
