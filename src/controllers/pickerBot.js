import TelegramBot from "node-telegram-bot-api";
import prisma from "../services/prisma.js";
import { getAddressFromCoordinates, formatLocationLinks } from "../utils/geocoding.js";

let bot = null;

// Initialize picker bot (for order pickers)
export const initPickerBot = (token) => {
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
      // Check if user exists and has ORDER_PICKER role
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

      if (user.role !== "ORDER_PICKER" && user.role !== "ADMIN") {
        await bot.sendMessage(
          chatId,
          `❌ Sizda buyurtmalarni yig'ish huquqi yo'q.\n\nBu bot faqat yig'uvchilar uchun.`
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `👋 Xush kelibsiz, ${firstName}!\n\n` +
          `📦 *Siz BUYURTMA YIG'UVCHI sifatida ishga kirdingiz.*\n\n` +
          `🛒 *Sizning vazifalaringiz:*\n` +
          `1️⃣ Qabul qilingan buyurtmalarni ko'rish\n` +
          `2️⃣ Mahsulotlarni omborda yig'ish\n` +
          `3️⃣ Yig'ish yakunlanganda tayyor deb belgilash\n\n` +
          `🔔 *Qanday ishlaydi:*\n` +
          `• Buyurtma qabul qilinganda sizga xabar keladi\n` +
          `• "🔄 Yig'ishni boshlash" tugmasini bosing\n` +
          `• Mahsulotlarni yig'ing\n` +
          `• "✅ Yig'ishni yakunlash" tugmasini bosing\n` +
          `• Buyurtma kuryerlarga yuboriladi\n\n` +
          `⏳ Yig'ish uchun buyurtmalar kutilmoqda...`,
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
      // Verify user has ORDER_PICKER or ADMIN role
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user || (user.role !== "ORDER_PICKER" && user.role !== "ADMIN")) {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Sizda bu amalni bajarish huquqi yo'q",
          show_alert: true,
        });
        return;
      }

      // Handle picking start
      if (data.startsWith("start_picking_")) {
        const orderId = parseInt(data.replace("start_picking_", ""));

        // Update order status to PREPARING
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PREPARING",
            pickerId: user.id,
            statusHistory: await addStatusHistory(
              orderId,
              "PREPARING",
              userId,
              "Yig'ish boshlandi"
            ),
          },
          include: {
            user: {
              select: { telegramId: true, name: true },
            },
          },
        });

        await bot.answerCallbackQuery(query.id, {
          text: "✅ Yig'ish boshlandi",
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

        // Send finish button
        await bot.sendMessage(chatId, `📦 Buyurtma #${orderId} yig'ilmoqda...`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Yig'ishni yakunlash",
                  callback_data: `finish_picking_${orderId}`,
                },
              ],
            ],
          },
        });

        // Notify client
        await notifyClient(
          order.user.telegramId,
          `📦 Buyurtmangiz yig'ilmoqda!\n\n📦 Buyurtma ID: #${orderId}\n\nTez orada tayyor bo'ladi.`
        );
      } else if (data.startsWith("finish_picking_")) {
        const orderId = parseInt(data.replace("finish_picking_", ""));

        // Update order status to READY_FOR_DELIVERY
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "READY_FOR_DELIVERY",
            statusHistory: await addStatusHistory(
              orderId,
              "READY_FOR_DELIVERY",
              userId,
              "Yig'ish yakunlandi"
            ),
          },
          include: {
            user: {
              select: { telegramId: true, name: true },
            },
            store: true,
          },
        });

        await bot.answerCallbackQuery(query.id, {
          text: "✅ Yig'ish yakunlandi",
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

        await bot.sendMessage(
          chatId,
          `✅ Buyurtma #${orderId} yig'ildi va dostavka uchun tayyor!`
        );

        // Notify couriers
        await notifyCouriers(order);
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
    console.error("Picker Bot polling error:", error);
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

  // Helper to notify couriers
  const notifyCouriers = async (order) => {
    const { notifyCouriersAboutOrder } = await import("./courierBot.js");
    await notifyCouriersAboutOrder(order);
  };

  console.log("✅ Picker Bot initialized successfully");
  return bot;
};

// Get bot instance
export const getPickerBot = () => {
  return bot;
};

// Send notification to pickers about new order
export const notifyPickersAboutOrder = async (order) => {
  if (!bot) {
    console.warn("Picker Bot not initialized. Notification not sent.");
    return;
  }

  try {
    // Get currency from items or default to SUM
    const items = Array.isArray(order.items) ? order.items : [];
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
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.productName || "Mahsulot"} - ${
              item.quantity
            } dona × ${(item.price || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"} = ${(item.totalPrice || item.price * item.quantity || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"}`
        )
        .join("\n");
    }

    // Get address name from coordinates if location exists
    let addressName = null;
    if (order.location) {
      addressName = await getAddressFromCoordinates(order.location);
    }

    // Format location with links
    const locationText = order.location 
      ? formatLocationLinks(order.location, addressName)
      : "";

    const message = `
📦 Yangi buyurtma yig'ish uchun!

📦 Buyurtma ID: #${order.id}
👤 Mijoz: ${order.user?.name || "Noma'lum"}
📞 Telefon: ${order.user?.phone || "N/A"}
🏪 Do'kon: ${order.store?.name || "N/A"}
💰 Jami: ${order.totalPrice.toLocaleString("uz-UZ")} ${currency}
${order.address ? `📍 Manzil: ${order.address}` : ""}
${locationText ? `\n${locationText}` : ""}
${itemsText ? `\n📋 Mahsulotlar:\n${itemsText}` : ""}
📅 Sana: ${new Date(order.createdAt).toLocaleString("uz-UZ")}
    `.trim();

    const pickers = await prisma.user.findMany({
      where: { role: "ORDER_PICKER" },
    });

    for (const picker of pickers) {
      if (picker.telegramId) {
        try {
          await bot.sendMessage(
            picker.telegramId,
            message,
            {
              parse_mode: 'Markdown',
              disable_web_page_preview: false,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔄 Yig'ishni boshlash",
                      callback_data: `start_picking_${order.id}`,
                    },
                  ],
                ],
              },
            }
          );
        } catch (error) {
          console.error(
            `Error sending notification to picker ${picker.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error notifying pickers:", error);
  }
};

