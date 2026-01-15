import TelegramBot from "node-telegram-bot-api";
import prisma from "../services/prisma.js";
import { getAddressFromCoordinates, formatLocationLinks } from "../utils/geocoding.js";

let bot = null;

// Initialize receiver bot (for order receivers)
export const initReceiverBot = (token) => {
  if (bot) {
    return bot;
  }

  bot = new TelegramBot(token, { polling: true });

  // /start command handler
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "";

    try {
      // Check if user exists and has ORDER_RECEIVER role
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user) {
        await bot.sendMessage(
          chatId,
          `❌ Siz tizimda ro'yxatdan o'tmagansiz.\n\nIltimos, admin bilan bog'laning.`
        );
        return;
      }

      if (user.role !== "ORDER_RECEIVER" && user.role !== "ADMIN") {
        await bot.sendMessage(
          chatId,
          `❌ Sizda buyurtmalarni qabul qilish huquqi yo'q.\n\nBu bot faqat buyurtma qabul qiluvchilar uchun.`
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `👋 Xush kelibsiz, ${firstName}!\n\n` +
          `📋 *Siz BUYURTMA QABUL QILUVCHI sifatida ishga kirdingiz.*\n\n` +
          `📦 *Sizning vazifalaringiz:*\n` +
          `1️⃣ Yangi buyurtmalarni ko'rish\n` +
          `2️⃣ Buyurtmani tasdiqlash yoki rad etish\n` +
          `3️⃣ Tasdiqlangan buyurtmalar yig'uvchilarga yuboriladi\n\n` +
          `🔔 *Qanday ishlaydi:*\n` +
          `• Yangi buyurtma kelganda sizga xabar keladi\n` +
          `• "✅ Tasdiqlash" tugmasini bosing - buyurtma qabul qilinadi\n` +
          `• "❌ Bekor qilish" tugmasini bosing - buyurtma bekor qilinadi\n\n` +
          `⏳ Yangi buyurtmalar kutilmoqda...`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error("Error in /start command:", error);
      await bot.sendMessage(
        chatId,
        "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      );
    }
  });

  // Handle callback queries
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userId = query.from.id;

    try {
      // Verify user has ORDER_RECEIVER or ADMIN role
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user || (user.role !== "ORDER_RECEIVER" && user.role !== "ADMIN")) {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Sizda bu amalni bajarish huquqi yo'q",
          show_alert: true,
        });
        return;
      }

      // Handle order acceptance
      if (data.startsWith("accept_order_")) {
        const orderId = parseInt(data.replace("accept_order_", ""));

        // Update order status to ACCEPTED
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "ACCEPTED",
            receiverId: user.id,
            statusHistory: await addStatusHistory(
              orderId,
              "ACCEPTED",
              userId,
              "Buyurtma qabul qilindi"
            ),
          },
          include: {
            user: {
              select: { telegramId: true, name: true },
            },
            store: true,
          },
        });

        // Send confirmation to receiver
        await bot.answerCallbackQuery(query.id, {
          text: "✅ Buyurtma qabul qilindi",
          show_alert: false,
        });

        // Edit message to show it's accepted
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: query.message.message_id,
          }
        );

        await bot.sendMessage(
          chatId,
          `✅ Buyurtma #${orderId} qabul qilindi va yig'uvchilarga yuborildi.`
        );

        // Notify client through client bot
        await notifyClient(
          order.user.telegramId,
          `✅ Buyurtmangiz qabul qilindi!\n\n📦 Buyurtma ID: #${orderId}\n\nBuyurtmangiz hozir tayyorlanmoqda.`
        );

        // Notify order pickers through picker bot
        await notifyPickers(order);
      } else if (data.startsWith("cancel_order_")) {
        const orderId = parseInt(data.replace("cancel_order_", ""));

        // Update order status to CANCELLED
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            receiverId: user.id,
            statusHistory: await addStatusHistory(
              orderId,
              "CANCELLED",
              userId,
              "Buyurtma bekor qilindi"
            ),
          },
          include: {
            user: {
              select: { telegramId: true, name: true },
            },
          },
        });

        // Send confirmation
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Buyurtma bekor qilindi",
          show_alert: false,
        });

        // Edit message
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: query.message.message_id,
          }
        );

        await bot.sendMessage(chatId, `❌ Buyurtma #${orderId} bekor qilindi.`);

        // Notify client
        await notifyClient(
          order.user.telegramId,
          `❌ Buyurtmangiz bekor qilindi!\n\n📦 Buyurtma ID: #${orderId}\n\nQo'shimcha ma'lumot uchun bog'laning.`
        );
      }

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error("Error handling callback query:", error);
      await bot.answerCallbackQuery(query.id, {
        text: "❌ Xatolik yuz berdi",
        show_alert: true,
      });
    }
  });

  // Error handler
  bot.on("polling_error", (error) => {
    console.error("Receiver Bot polling error:", error);
  });

  // Helper function to add status history
  const addStatusHistory = async (orderId, status, userId, note) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { statusHistory: true },
    });

    const history = order?.statusHistory || [];
    history.push({
      status,
      timestamp: new Date().toISOString(),
      userId,
      note,
    });

    return history;
  };

  // Helper to notify client
  const notifyClient = async (telegramId, message) => {
    const { sendMessageToClient } = await import("./clientBot.js");
    await sendMessageToClient(telegramId, message);
  };

  // Helper to notify pickers
  const notifyPickers = async (order) => {
    const { notifyPickersAboutOrder } = await import("./pickerBot.js");
    await notifyPickersAboutOrder(order);
  };

  console.log("✅ Receiver Bot initialized successfully");
  return bot;
};

// Get bot instance
export const getReceiverBot = () => {
  return bot;
};

// Send new order notification to receivers
export const notifyReceivers = async (orderData) => {
  if (!bot) {
    console.warn("Receiver Bot not initialized. Notification not sent.");
    return;
  }

  try {
    // Get currency from items or default to SUM
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const currency = items[0]?.currency || "SUM";

    // Enrich items with product names if missing
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        if (item.productName) {
          return item;
        }
        
        // Fetch product name from database if missing
        try {
          const product = await prisma.product.findUnique({
            where: { id: parseInt(item.productId) },
            select: { name: true, code: true },
          });
          
          return {
            ...item,
            productName: product?.name || "Mahsulot",
            productCode: product?.code || null,
          };
        } catch (error) {
          return {
            ...item,
            productName: "Mahsulot",
          };
        }
      })
    );

    // Format items list with names and prices
    let itemsText = "";
    if (enrichedItems.length > 0) {
      itemsText = enrichedItems
        .slice(0, 5)
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.productName || "Mahsulot"} - ${
              item.quantity
            } dona × ${(item.price || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"} = ${(item.totalPrice || item.price * item.quantity || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"}`
        )
        .join("\n");
      if (enrichedItems.length > 5) {
        itemsText += `\n... va yana ${enrichedItems.length - 5} ta`;
      }
    }

    // Get address name from coordinates if location exists
    let addressName = null;
    if (orderData.location) {
      addressName = await getAddressFromCoordinates(orderData.location);
    }

    // Format location with links
    const locationText = orderData.location 
      ? formatLocationLinks(orderData.location, addressName)
      : "";

    const message = `
🆕 Yangi buyurtma!

📦 Buyurtma ID: #${orderData.id}
👤 Mijoz: ${orderData.user?.name || "Noma'lum"}
📞 Telefon: ${orderData.user?.phone || "N/A"}
🏪 Do'kon: ${orderData.store?.name || "N/A"}
💰 Jami: ${orderData.totalPrice.toLocaleString("uz-UZ")} ${currency}
${orderData.address ? `📍 Manzil: ${orderData.address}` : ""}
${locationText ? `\n${locationText}` : ""}
${itemsText ? `\n📋 Mahsulotlar:\n${itemsText}` : ""}
📅 Sana: ${new Date(orderData.createdAt).toLocaleString("uz-UZ")}
    `.trim();

    // Send to all users with ORDER_RECEIVER or ADMIN role
    const receivers = await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "ORDER_RECEIVER"],
        },
      },
    });

    for (const receiver of receivers) {
      if (receiver.telegramId) {
        try {
          await bot.sendMessage(receiver.telegramId, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Tasdiqlash",
                    callback_data: `accept_order_${orderData.id}`,
                  },
                  {
                    text: "❌ Bekor qilish",
                    callback_data: `cancel_order_${orderData.id}`,
                  },
                ],
              ],
            },
          });
        } catch (error) {
          console.error(
            `Error sending notification to receiver ${receiver.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending receiver notification:", error);
  }
};

