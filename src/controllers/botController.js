import TelegramBot from "node-telegram-bot-api";
import prisma from "../services/prisma.js";

let bot = null;

// Initialize bot
export const initBot = (token) => {
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
    const username = msg.from.username || null;

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
        // User already has phone, send Web App
        await sendWebAppButton(chatId, firstName || user.name);
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
            `🛒 Buyurtma berish uchun quyidagi tugmani bosing:`,
          {
            reply_markup: {
              remove_keyboard: true,
            },
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
              remove_keyboard: true,
            },
          }
        );
      }

      // Send Web App button
      await sendWebAppButton(chatId, user.name || firstName);
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
      `👋 Salom, ${userName}!\n\n🛒 Buyurtma berish uchun quyidagi tugmani bosing:`,
      {
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

  // Handle callback queries
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userId = query.from.id;

    try {
      // Handle order acceptance/cancellation
      if (data.startsWith("accept_order_")) {
        const orderId = parseInt(data.replace("accept_order_", ""));

        // Update order status to ACCEPTED
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "ACCEPTED",
            receiverId: await getUserIdByTelegramId(String(userId)),
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

        // Notify client
        if (order.user && order.user.telegramId) {
          await bot.sendMessage(
            order.user.telegramId,
            `✅ Buyurtmangiz qabul qilindi!\n\n📦 Buyurtma ID: #${orderId}\n\nBuyurtmangiz hozir tayyorlanmoqda.`
          );
        }

        // Notify order pickers
        const pickers = await prisma.user.findMany({
          where: { role: "ORDER_PICKER" },
        });

        for (const picker of pickers) {
          if (picker.telegramId) {
            await bot.sendMessage(
              picker.telegramId,
              `📦 Yangi buyurtma yig'ish uchun!\n\nBuyurtma #${orderId}\n🏪 Do'kon: ${order.store?.name}\n\nYig'ishni boshlang.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "🔄 Yig'ishni boshlash",
                        callback_data: `start_picking_${orderId}`,
                      },
                    ],
                  ],
                },
              }
            );
          }
        }
      } else if (data.startsWith("cancel_order_")) {
        const orderId = parseInt(data.replace("cancel_order_", ""));

        // Update order status to CANCELLED
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            receiverId: await getUserIdByTelegramId(String(userId)),
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
        if (order.user && order.user.telegramId) {
          await bot.sendMessage(
            order.user.telegramId,
            `❌ Buyurtmangiz bekor qilindi!\n\n📦 Buyurtma ID: #${orderId}\n\nQo'shimcha ma'lumot uchun bog'laning.`
          );
        }
      } else if (data.startsWith("start_picking_")) {
        const orderId = parseInt(data.replace("start_picking_", ""));

        // Update order status to PREPARING
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PREPARING",
            pickerId: await getUserIdByTelegramId(String(userId)),
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
        await bot.sendMessage(
          chatId,
          `📦 Buyurtma #${orderId} yig'ilmoqda...`,
          {
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
          }
        );

        // Notify client
        if (order.user && order.user.telegramId) {
          await bot.sendMessage(
            order.user.telegramId,
            `📦 Buyurtmangiz yig'ilmoqda!\n\n📦 Buyurtma ID: #${orderId}\n\nTez orada tayyor bo'ladi.`
          );
        }
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
        const couriers = await prisma.user.findMany({
          where: { role: "COURIER" },
        });

        for (const courier of couriers) {
          if (courier.telegramId) {
            await bot.sendMessage(
              courier.telegramId,
              `🚚 Yangi buyurtma dostavka uchun!\n\nBuyurtma #${orderId}\n🏪 Do'kon: ${
                order.store?.name
              }\n📍 Manzil: ${order.address || "N/A"}\n\nDostavkani boshlang.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "🚚 Dostavkani boshlash",
                        callback_data: `start_delivery_${orderId}`,
                      },
                    ],
                  ],
                },
              }
            );
          }
        }
      } else if (data.startsWith("start_delivery_")) {
        const orderId = parseInt(data.replace("start_delivery_", ""));

        // Update order status to SHIPPING
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "SHIPPING",
            courierId: await getUserIdByTelegramId(String(userId)),
            statusHistory: await addStatusHistory(
              orderId,
              "SHIPPING",
              userId,
              "Dostavka boshlandi"
            ),
          },
          include: {
            user: {
              select: { telegramId: true, name: true },
            },
          },
        });

        await bot.answerCallbackQuery(query.id, {
          text: "✅ Dostavka boshlandi",
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

        // Send complete button
        await bot.sendMessage(chatId, `🚚 Buyurtma #${orderId} yo'lda...`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Dostavkani yakunlash",
                  callback_data: `complete_delivery_${orderId}`,
                },
              ],
            ],
          },
        });

        // Notify client
        if (order.user && order.user.telegramId) {
          await bot.sendMessage(
            order.user.telegramId,
            `🚚 Buyurtmangiz yo'lda!\n\n📦 Buyurtma ID: #${orderId}\n\nKuryerimiz sizga yetib keladi.`
          );
        }
      } else if (data.startsWith("complete_delivery_")) {
        const orderId = parseInt(data.replace("complete_delivery_", ""));

        // Update order status to COMPLETED
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "COMPLETED",
            statusHistory: await addStatusHistory(
              orderId,
              "COMPLETED",
              userId,
              "Dostavka yakunlandi"
            ),
          },
          include: {
            user: {
              select: { telegramId: true, name: true },
            },
          },
        });

        await bot.answerCallbackQuery(query.id, {
          text: "✅ Buyurtma yakunlandi",
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
          `🎉 Buyurtma #${orderId} muvaffaqiyatli yakunlandi!`
        );

        // Notify client
        if (order.user && order.user.telegramId) {
          await bot.sendMessage(
            order.user.telegramId,
            `🎉 Buyurtmangiz yakunlandi!\n\n📦 Buyurtma ID: #${orderId}\n\nXaridingiz uchun rahmat!`
          );
        }
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
    console.error("Telegram Bot polling error:", error);
  });

  // Helper function to get user ID by telegram ID
  const getUserIdByTelegramId = async (telegramId) => {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });
    return user ? user.id : null;
  };

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

  console.log("✅ Telegram Bot initialized successfully");
  return bot;
};

// Get bot instance
export const getBot = () => {
  return bot;
};

// Send message to user
export const sendMessage = async (chatId, text, options = {}) => {
  if (!bot) {
    console.warn("Bot is not initialized. Message not sent.");
    return null;
  }
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
};

// Send order notification to admin and order receivers
export const notifyAdmin = async (orderData) => {
  if (!bot) {
    console.warn("Bot not initialized. Notification not sent.");
    return;
  }

  try {
    // Get currency from items or default to SUM
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const currency = items[0]?.currency || "SUM";

    // Format items list
    let itemsText = "";
    if (items.length > 0) {
      itemsText = items
        .slice(0, 5)
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.productName || "Mahsulot"} - ${
              item.quantity
            } dona`
        )
        .join("\n");
      if (items.length > 5) {
        itemsText += `\n... va yana ${items.length - 5} ta`;
      }
    }

    const message = `
🆕 Yangi buyurtma!

📦 Buyurtma ID: #${orderData.id}
👤 Mijoz: ${orderData.user?.name || "Noma'lum"}
📞 Telefon: ${orderData.user?.phone || "N/A"}
🏪 Do'kon: ${orderData.store?.name || "N/A"}
💰 Jami: ${orderData.totalPrice.toLocaleString("uz-UZ")} ${currency}
${orderData.address ? `📍 Manzil: ${orderData.address}` : ""}
${orderData.location ? `🗺️ Lokatsiya: ${orderData.location}` : ""}
${itemsText ? `\n📋 Mahsulotlar:\n${itemsText}` : ""}
📅 Sana: ${new Date(orderData.createdAt).toLocaleString("uz-UZ")}
    `.trim();

    // Send to admin (only info message, no buttons)
    const adminChatId = process.env.ADMIN_CHAT_ID;
    if (adminChatId) {
      await bot.sendMessage(adminChatId, message);
    }

    // Send to all users with ORDER_RECEIVER or ADMIN role WITH ACTION BUTTONS
    const { default: prisma } = await import("../services/prisma.js");
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
            `Error sending notification to user ${receiver.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
};
