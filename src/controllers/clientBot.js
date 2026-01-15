import TelegramBot from "node-telegram-bot-api";
import prisma from "../services/prisma.js";

let bot = null;

// Initialize client bot (for customers)
export const initClientBot = (token) => {
  if (bot) {
    return bot;
  }

  bot = new TelegramBot(token, { polling: true });

  // /start command handler
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "";
    const lastName = msg.from.last_name || "";

    try {
      // Check if user exists and has phone number
      let user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user || !user.phone) {
        // Request phone number
        await bot.sendMessage(
          chatId,
          `👋 Salom, ${firstName || "Foydalanuvchi"}!\n\n` +
            `📱 Ro'yxatdan o'tish uchun telefon raqamingizni ulashing.\n\n` +
            `Quyidagi tugmani bosing:`,
          {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: "📱 Telefon raqamni ulashish",
                    request_contact: true,
                  },
                ],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        );
      } else {
        // User already has phone, show welcome message with menu
        await bot.sendMessage(
          chatId,
          `👋 Xush kelibsiz, ${firstName || user.name}!\n\n` +
            `🛒 *Bizning bot orqali:*\n` +
            `✅ Mahsulotlarni ko'rishingiz\n` +
            `✅ Savatga qo'shishingiz\n` +
            `✅ Buyurtma berishingiz\n` +
            `✅ Buyurtma holatini kuzatishingiz mumkin\n\n` +
            `💡 Pastdagi tugmalardan foydalaning!`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [
                  { text: '🛒 Buyurtma berish' }
                ],
                [
                  { text: '📦 Mening buyurtmalarim' },
                  { text: '📊 Buyurtmalar tarixi' }
                ]
              ],
              resize_keyboard: true,
              persistent: true
            }
          }
        );
      }
    } catch (error) {
      console.error("Error in /start command:", error);
      await bot.sendMessage(
        chatId,
        "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      );
    }
  });

  // Handle contact sharing
  bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "";
    const lastName = msg.from.last_name || "";
    const contact = msg.contact;

    // Check if user shared their own contact
    if (contact.user_id !== userId) {
      await bot.sendMessage(
        chatId,
        "❌ Iltimos, o'z telefon raqamingizni ulashing.",
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: "📱 Telefon raqamni ulashish",
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
      return;
    }

    try {
      const phoneNumber = contact.phone_number;

      // Create or update user
      let user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            telegramId: String(userId),
            name:
              `${firstName} ${lastName}`.trim() ||
              contact.first_name ||
              "Foydalanuvchi",
            phone: phoneNumber,
            role: "CLIENT",
          },
        });

        await bot.sendMessage(
          chatId,
          `✅ Muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n` +
            `👤 Ism: ${user.name}\n` +
            `📱 Telefon: ${phoneNumber}\n\n` +
            `🛒 Pastdagi tugmalardan foydalaning!`,
          {
            reply_markup: {
              keyboard: [
                [
                  { text: '🛒 Buyurtma berish' }
                ],
                [
                  { text: '📦 Mening buyurtmalarim' },
                  { text: '📊 Buyurtmalar tarixi' }
                ]
              ],
              resize_keyboard: true,
              persistent: true
            }
          }
        );
      } else {
        // Update existing user's phone
        user = await prisma.user.update({
          where: { telegramId: String(userId) },
          data: {
            name: `${firstName} ${lastName}`.trim() || user.name,
            phone: phoneNumber,
          },
        });

        await bot.sendMessage(
          chatId,
          `✅ Ma'lumotlaringiz yangilandi!\n\n` +
            `👤 Ism: ${user.name}\n` +
            `📱 Telefon: ${phoneNumber}`,
          {
            reply_markup: {
              keyboard: [
                [
                  { text: '🛒 Buyurtma berish' }
                ],
                [
                  { text: '📦 Mening buyurtmalarim' },
                  { text: '📊 Buyurtmalar tarixi' }
                ]
              ],
              resize_keyboard: true,
              persistent: true
            }
          }
        );
      }
    } catch (error) {
      console.error("Error handling contact:", error);
      await bot.sendMessage(
        chatId,
        "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      );
    }
  });

  // Helper function to send Web App button
  const sendWebAppButton = async (chatId, userName) => {
    const webAppUrl =
      process.env.WEB_APP_URL || "https://zakaz-web-app.vercel.app";

    await bot.sendMessage(
      chatId,
      `🛍️ *Buyurtma berish*\n\nQuyidagi tugmani bosib do'konni oching:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🛒 Do'konni ochish",
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      }
    );
  };

  // Helper function to show user's active orders
  const showMyOrders = async (chatId, userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) }
      });

      if (!user) {
        await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.');
        return;
      }

      // Get active orders (not completed or cancelled)
      const activeOrders = await prisma.order.findMany({
        where: {
          userId: user.id,
          status: {
            notIn: ['COMPLETED', 'CANCELLED']
          }
        },
        include: {
          store: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (activeOrders.length === 0) {
        await bot.sendMessage(
          chatId,
          `📭 *Faol buyurtmalar yo'q*\n\n` +
          `Hozirda sizda faol buyurtmalar mavjud emas.\n\n` +
          `🛒 Buyurtma berish uchun "Buyurtma berish" tugmasini bosing!`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `📦 *Mening buyurtmalarim*\n\n` +
        `Faol buyurtmalar: ${activeOrders.length} ta\n\n` +
        `⬇️ Quyida buyurtmalar ro'yxati:`,
        { parse_mode: 'Markdown' }
      );

      // Send each order
      for (const order of activeOrders) {
        const statusEmoji = {
          'PENDING': '⏳',
          'ACCEPTED': '✅',
          'PREPARING': '📦',
          'READY_FOR_DELIVERY': '🎁',
          'SHIPPING': '🚚'
        };

        const statusText = {
          'PENDING': 'Kutilmoqda',
          'ACCEPTED': 'Qabul qilindi',
          'PREPARING': 'Tayyorlanmoqda',
          'READY_FOR_DELIVERY': 'Tayyor',
          'SHIPPING': 'Yo\'lda'
        };

        const items = Array.isArray(order.items) ? order.items : [];
        const currency = items[0]?.currency || 'SUM';

        let itemsText = items
          .slice(0, 3)
          .map((item, idx) => `${idx + 1}. ${item.productName || 'Mahsulot'} - ${item.quantity} dona`)
          .join('\n');
        
        if (items.length > 3) {
          itemsText += `\n... va yana ${items.length - 3} ta`;
        }

        const message = `
${statusEmoji[order.status] || '📦'} *Buyurtma #${order.id}*
📊 Holat: ${statusText[order.status] || order.status}

🏪 Do'kon: ${order.store?.name || 'N/A'}
💰 Jami: ${order.totalPrice.toLocaleString('uz-UZ')} ${currency}
${order.address ? `📍 Manzil: ${order.address}` : ''}

📋 *Mahsulotlar:*
${itemsText || 'Mahsulotlar mavjud emas'}

📅 Sana: ${new Date(order.createdAt).toLocaleString('uz-UZ')}
        `.trim();

        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      console.error('Error showing orders:', error);
      await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.');
    }
  };

  // Helper function to show order history
  const showOrderHistory = async (chatId, userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) }
      });

      if (!user) {
        await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.');
        return;
      }

      // Get all orders
      const allOrders = await prisma.order.findMany({
        where: {
          userId: user.id
        },
        include: {
          store: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      if (allOrders.length === 0) {
        await bot.sendMessage(
          chatId,
          `📭 *Buyurtmalar tarixi bo'sh*\n\n` +
          `Siz hali hech qanday buyurtma bermagansiz.\n\n` +
          `🛒 Buyurtma berish uchun "Buyurtma berish" tugmasini bosing!`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const stats = {
        total: allOrders.length,
        completed: allOrders.filter(o => o.status === 'COMPLETED').length,
        cancelled: allOrders.filter(o => o.status === 'CANCELLED').length,
        active: allOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length
      };

      await bot.sendMessage(
        chatId,
        `📊 *Buyurtmalar tarixi*\n\n` +
        `📦 Jami buyurtmalar: ${stats.total}\n` +
        `✅ Tugallangan: ${stats.completed}\n` +
        `⏳ Faol: ${stats.active}\n` +
        `❌ Bekor qilingan: ${stats.cancelled}\n\n` +
        `⬇️ Oxirgi 20 ta buyurtma:`,
        { parse_mode: 'Markdown' }
      );

      // Send each order
      for (const order of allOrders) {
        const statusEmoji = {
          'PENDING': '⏳',
          'ACCEPTED': '✅',
          'PREPARING': '📦',
          'READY_FOR_DELIVERY': '🎁',
          'SHIPPING': '🚚',
          'COMPLETED': '🎉',
          'CANCELLED': '❌'
        };

        const statusText = {
          'PENDING': 'Kutilmoqda',
          'ACCEPTED': 'Qabul qilindi',
          'PREPARING': 'Tayyorlanmoqda',
          'READY_FOR_DELIVERY': 'Tayyor',
          'SHIPPING': 'Yo\'lda',
          'COMPLETED': 'Tugallandi',
          'CANCELLED': 'Bekor qilindi'
        };

        const items = Array.isArray(order.items) ? order.items : [];
        const currency = items[0]?.currency || 'SUM';

        const message = `
${statusEmoji[order.status] || '📦'} *Buyurtma #${order.id}*
📊 Holat: ${statusText[order.status] || order.status}

🏪 Do'kon: ${order.store?.name || 'N/A'}
💰 Jami: ${order.totalPrice.toLocaleString('uz-UZ')} ${currency}

📅 Sana: ${new Date(order.createdAt).toLocaleString('uz-UZ')}
        `.trim();

        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      console.error('Error showing order history:', error);
      await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.');
    }
  };

  // Handle button text (Reply Keyboard)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    // Ignore commands and contact sharing
    if (text?.startsWith('/') || msg.contact) return;

    try {
      // Handle "Buyurtma berish" button
      if (text === '🛒 Buyurtma berish') {
        const user = await prisma.user.findUnique({
          where: { telegramId: String(userId) }
        });
        
        if (user && user.name) {
          await sendWebAppButton(chatId, user.name);
        } else {
          await bot.sendMessage(
            chatId,
            '❌ Iltimos, avval telefon raqamingizni ulashing.\n\n/start buyrug\'ini yuboring.'
          );
        }
      }
      // Handle "Mening buyurtmalarim" button
      else if (text === '📦 Mening buyurtmalarim') {
        await showMyOrders(chatId, userId);
      }
      // Handle "Buyurtmalar tarixi" button
      else if (text === '📊 Buyurtmalar tarixi') {
        await showOrderHistory(chatId, userId);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Error handler
  bot.on("polling_error", (error) => {
    console.error("Client Bot polling error:", error);
  });

  console.log("✅ Client Bot initialized successfully");
  return bot;
};

// Get bot instance
export const getClientBot = () => {
  return bot;
};

// Send message to client
export const sendMessageToClient = async (chatId, text, options = {}) => {
  if (!bot) {
    console.warn("Client Bot is not initialized. Message not sent.");
    return null;
  }
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error("Error sending message to client:", error);
    return null;
  }
};

