import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import botRoutes from './routes/botRoutes.js';
import { initClientBot } from './controllers/clientBot.js';
import { initAdminBot } from './controllers/adminBot.js';
import { initReceiverBot } from './controllers/receiverBot.js';
import { initPickerBot } from './controllers/pickerBot.js';
import { initCourierBot } from './controllers/courierBot.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Initialize Telegram Bots for different roles
console.log('\n🤖 Initializing Telegram Bots...\n');

// Client Bot (for customers)
const CLIENT_BOT_TOKEN = process.env.CLIENT_BOT_TOKEN;
if (CLIENT_BOT_TOKEN) {
  initClientBot(CLIENT_BOT_TOKEN);
} else {
  console.warn('⚠️  CLIENT_BOT_TOKEN not found. Client bot will not work.');
}

// Admin Bot (for administrators)
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
if (ADMIN_BOT_TOKEN) {
  initAdminBot(ADMIN_BOT_TOKEN);
} else {
  console.warn('⚠️  ADMIN_BOT_TOKEN not found. Admin bot will not work.');
}

// Receiver Bot (for order receivers)
const RECEIVER_BOT_TOKEN = process.env.RECEIVER_BOT_TOKEN;
if (RECEIVER_BOT_TOKEN) {
  initReceiverBot(RECEIVER_BOT_TOKEN);
} else {
  console.warn('⚠️  RECEIVER_BOT_TOKEN not found. Receiver bot will not work.');
}

// Picker Bot (for order pickers)
const PICKER_BOT_TOKEN = process.env.PICKER_BOT_TOKEN;
if (PICKER_BOT_TOKEN) {
  initPickerBot(PICKER_BOT_TOKEN);
} else {
  console.warn('⚠️  PICKER_BOT_TOKEN not found. Picker bot will not work.');
}

// Courier Bot (for couriers)
const COURIER_BOT_TOKEN = process.env.COURIER_BOT_TOKEN;
if (COURIER_BOT_TOKEN) {
  initCourierBot(COURIER_BOT_TOKEN);
} else {
  console.warn('⚠️  COURIER_BOT_TOKEN not found. Courier bot will not work.');
}

console.log('\n✅ All bots initialization completed!\n');

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/bot', botRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Admin API: http://localhost:${PORT}/api/admin`);
  console.log(`Client API: http://localhost:${PORT}/api/client`);
  console.log(`Bot API: http://localhost:${PORT}/api/bot`);
});

export default app;
