import TelegramBot from "node-telegram-bot-api";
import prisma from "../services/prisma.js";
import { getAddressFromCoordinates, formatLocationLinks } from "../utils/geocoding.js";

let bot = null;

// Initialize courier bot (for couriers)
export const initCourierBot = (token) => {
  if (bot) {
    return bot;
  }

  bot = new TelegramBot(token, { polling: true });

  // Helper function to verify courier
  const verifyCourier = async (userId) => {
    const user = await prisma.user.findUnique({
      where: { telegramId: String(userId) },
    });

    if (!user) {
      return { valid: false, message: '❌ Siz tizimda ro\'yxatdan o\'tmagansiz.\n\nIltimos, admin bilan bog\'laning.' };
    }

    if (user.role !== "COURIER" && user.role !== "ADMIN") {
      return { valid: false, message: '❌ Sizda buyurtmalarni yetkazish huquqi yo\'q.\n\nBu bot faqat kuryerlar uchun.' };
    }

    return { valid: true, user };
  };

  // /start command handler
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || "";

    try {
      const verification = await verifyCourier(userId);
      if (!verification.valid) {
        await bot.sendMessage(chatId, verification.message);
        return;
      }

      await bot.sendMessage(
        chatId,
        `👋 Xush kelibsiz, ${firstName}!\n\n` +
          `🚚 *Siz KURYER sifatida ishga kirdingiz.*\n\n` +
          `🛵 *Sizning vazifalaringiz:*\n` +
          `1️⃣ Tayyor buyurtmalarni ko'rish\n` +
          `2️⃣ Buyurtmani mijozga yetkazib berish\n` +
          `3️⃣ Dostavka yakunlanganda tasdiqlash\n\n` +
          `🔔 *Qanday ishlaydi:*\n` +
          `• Buyurtma tayyor bo'lganda sizga xabar keladi\n` +
          `• Mijoz manzili va telefon raqami ko'rsatiladi\n` +
          `• "🚚 Dostavkani boshlash" tugmasini bosing\n` +
          `• Mijozga yetkazib bering\n` +
          `• "✅ Dostavkani yakunlash" tugmasini bosing\n\n` +
          `💡 Pastdagi tugmalardan foydalaning!\n\n` +
          `⏳ Dostavka uchun buyurtmalar kutilmoqda...`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            keyboard: [
              [
                { text: '📦 Faol buyurtmalar' },
                { text: '✅ Tugallangan buyurtmalar' }
              ]
            ],
            resize_keyboard: true,
            persistent: true
          }
        }
      );
    } catch (error) {
      console.error("Error in /start command:", error);
      await bot.sendMessage(
        chatId,
        "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      );
    }
  });

  // Helper function to show active orders
  const showActiveOrders = async (chatId, userId) => {
    try {
      const verification = await verifyCourier(userId);
      if (!verification.valid) {
        await bot.sendMessage(chatId, verification.message);
        return;
      }

      const user = verification.user;

      // Get active orders for this courier (READY_FOR_DELIVERY + SHIPPING)
      const activeOrders = await prisma.order.findMany({
        where: {
          courierId: user.id,
          status: {
            in: ['READY_FOR_DELIVERY', 'SHIPPING']
          }
        },
        include: {
          user: {
            select: { name: true, phone: true }
          },
          store: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeOrders.length === 0) {
        await bot.sendMessage(
          chatId,
          `📭 *Faol buyurtmalar yo'q*\n\n` +
          `Hozirda sizga tayinlangan dostavka uchun buyurtmalar yo'q.\n\n` +
          `Yangi buyurtmalar tayyor bo'lganda sizga xabar beramiz! 🚚`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [
                  { text: '📦 Faol buyurtmalar' },
                  { text: '✅ Tugallangan buyurtmalar' }
                ]
              ],
              resize_keyboard: true,
              persistent: true
            }
          }
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `📦 *Faol buyurtmalar*\n\n` +
        `Jami: ${activeOrders.length} ta buyurtma\n\n` +
        `⬇️ Quyida buyurtmalar ro'yxati:`,
        { parse_mode: 'Markdown' }
      );

      // Send each order as a separate message
      for (const order of activeOrders) {
        const items = Array.isArray(order.items) ? order.items : [];
        const currency = items[0]?.currency || 'SUM';

        // Enrich items with product names if missing
        const enrichedItems = await Promise.all(
          items.map(async (item) => {
            if (item.productName) {
              return item;
            }
            
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
        let itemsText = '';
        if (enrichedItems.length > 0) {
          itemsText = enrichedItems
            .map(
              (item, idx) =>
                `${idx + 1}. ${item.productName || "Mahsulot"} - ${
                  item.quantity
                } dona × ${(item.price || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"} = ${(item.totalPrice || item.price * item.quantity || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"}`
            )
            .join('\n');
        }

        const statusText = order.status === 'READY_FOR_DELIVERY' 
          ? '📦 Tayyor - dostavka uchun' 
          : '🚚 Yo\'lda';

        const message = `
🚚 *Buyurtma #${order.id}*
📊 Holat: ${statusText}

👤 Mijoz: ${order.user?.name || 'Noma\'lum'}
📞 Telefon: ${order.user?.phone || 'N/A'}
🏪 Do'kon: ${order.store?.name || 'N/A'}
💰 Jami: ${order.totalPrice.toLocaleString('uz-UZ')} ${currency}
${order.address ? `📍 Manzil: ${order.address}` : ''}

📋 *Mahsulotlar:*
${itemsText || 'Mahsulotlar mavjud emas'}

⏰ Tayyor bo'ldi: ${new Date(order.updatedAt).toLocaleString('uz-UZ')}
        `.trim();

        const buttons = [];
        if (order.status === 'READY_FOR_DELIVERY') {
          buttons.push([{
            text: '🚚 Dostavkani boshlash',
            callback_data: `start_delivery_${order.id}`
          }]);
        } else if (order.status === 'SHIPPING') {
          buttons.push([{
            text: '✅ Dostavkani yakunlash',
            callback_data: `complete_delivery_${order.id}`
          }]);
        }

        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: buttons
          }
        });

        // Send location if available
        if (order.location) {
          try {
            // Parse location coordinates (format: "lat,lng" or "lat, lng")
            const coords = order.location.split(',').map(c => parseFloat(c.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              const [latitude, longitude] = coords;
              
              // Send location with map
              await bot.sendLocation(chatId, latitude, longitude, {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '🗺️ Google Maps da ochish',
                        url: `https://www.google.com/maps?q=${latitude},${longitude}`
                      }
                    ],
                    [
                      {
                        text: '🗺️ Yandex Maps da ochish',
                        url: `https://yandex.uz/maps/?pt=${longitude},${latitude}&z=16&l=map`
                      }
                    ]
                  ]
                }
              });
            }
          } catch (error) {
            console.error('Error sending location:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error showing active orders:', error);
      await bot.sendMessage(
        chatId,
        '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
      );
    }
  };

  // /my_orders command handler
  bot.onText(/\/my_orders/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    await showActiveOrders(chatId, userId);
  });

  // Helper function to show completed orders
  const showCompletedOrders = async (chatId, userId) => {
    try {
      const verification = await verifyCourier(userId);
      if (!verification.valid) {
        await bot.sendMessage(chatId, verification.message);
        return;
      }

      const user = verification.user;

      // Get completed orders for this courier (last 20)
      const completedOrders = await prisma.order.findMany({
        where: {
          courierId: user.id,
          status: 'COMPLETED'
        },
        include: {
          user: {
            select: { name: true, phone: true }
          },
          store: {
            select: { name: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      });

      if (completedOrders.length === 0) {
        await bot.sendMessage(
          chatId,
          `📭 *Tugallangan buyurtmalar yo'q*\n\n` +
          `Hozircha siz hech qanday buyurtmani yakunlamagansiz.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [
                  { text: '📦 Faol buyurtmalar' },
                  { text: '✅ Tugallangan buyurtmalar' }
                ]
              ],
              resize_keyboard: true,
              persistent: true
            }
          }
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `✅ *Tugallangan buyurtmalar*\n\n` +
        `Jami: ${completedOrders.length} ta buyurtma (oxirgi 20 ta)\n\n` +
        `⬇️ Quyida buyurtmalar ro'yxati:`,
        { parse_mode: 'Markdown' }
      );

      // Send each order as a separate message
      for (const order of completedOrders) {
        const items = Array.isArray(order.items) ? order.items : [];
        const currency = items[0]?.currency || 'SUM';

        // Enrich items with product names if missing
        const enrichedItems = await Promise.all(
          items.map(async (item) => {
            if (item.productName) {
              return item;
            }
            
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
        let itemsText = '';
        if (enrichedItems.length > 0) {
          itemsText = enrichedItems
            .map(
              (item, idx) =>
                `${idx + 1}. ${item.productName || "Mahsulot"} - ${
                  item.quantity
                } dona × ${(item.price || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"} = ${(item.totalPrice || item.price * item.quantity || 0).toLocaleString("uz-UZ")} ${item.currency || "SUM"}`
            )
            .join('\n');
        }

        const message = `
✅ *Buyurtma #${order.id}* - Tugallangan

👤 Mijoz: ${order.user?.name || 'Noma\'lum'}
📞 Telefon: ${order.user?.phone || 'N/A'}
🏪 Do'kon: ${order.store?.name || 'N/A'}
💰 Jami: ${order.totalPrice.toLocaleString('uz-UZ')} ${currency}
${order.address ? `📍 Manzil: ${order.address}` : ''}

📋 *Mahsulotlar:*
${itemsText || 'Mahsulotlar mavjud emas'}

🎉 Tugallandi: ${new Date(order.updatedAt).toLocaleString('uz-UZ')}
        `.trim();

        await bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      console.error('Error showing completed orders:', error);
      await bot.sendMessage(
        chatId,
        '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
      );
    }
  };

  // Handle button text (Reply Keyboard)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    // Ignore commands (they're handled by onText)
    if (text?.startsWith('/')) return;

    // Handle "Faol buyurtmalar" button
    if (text === '📦 Faol buyurtmalar') {
      await showActiveOrders(chatId, userId);
    }
    // Handle "Tugallangan buyurtmalar" button
    else if (text === '✅ Tugallangan buyurtmalar') {
      await showCompletedOrders(chatId, userId);
    }
  });

  // Handle callback queries
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userId = query.from.id;

    try {
      // Verify user has COURIER or ADMIN role
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user || (user.role !== "COURIER" && user.role !== "ADMIN")) {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Sizda bu amalni bajarish huquqi yo'q",
          show_alert: true,
        });
        return;
      }

      // Handle delivery start
      if (data.startsWith("start_delivery_")) {
        const orderId = parseInt(data.replace("start_delivery_", ""));

        // Update order status to SHIPPING
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "SHIPPING",
            courierId: user.id,
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
        await notifyClient(
          order.user.telegramId,
          `🚚 Buyurtmangiz yo'lda!\n\n📦 Buyurtma ID: #${orderId}\n\nKuryerimiz sizga yetib keladi.`
        );
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
        await notifyClient(
          order.user.telegramId,
          `🎉 Buyurtmangiz yakunlandi!\n\n📦 Buyurtma ID: #${orderId}\n\nXaridingiz uchun rahmat!`
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
    console.error("Courier Bot polling error:", error);
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

  console.log("✅ Courier Bot initialized successfully");
  return bot;
};

// Get bot instance
export const getCourierBot = () => {
  return bot;
};

// Send notification to couriers about ready order
export const notifyCouriersAboutOrder = async (order) => {
  if (!bot) {
    console.warn("Courier Bot not initialized. Notification not sent.");
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
🚚 Yangi buyurtma dostavka uchun!

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

    const couriers = await prisma.user.findMany({
      where: { role: "COURIER" },
    });

    for (const courier of couriers) {
      if (courier.telegramId) {
        try {
          await bot.sendMessage(
            courier.telegramId,
            message,
            {
              parse_mode: 'Markdown',
              disable_web_page_preview: false,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🚚 Dostavkani boshlash",
                      callback_data: `start_delivery_${order.id}`,
                    },
                  ],
                ],
              },
            }
          );
        } catch (error) {
          console.error(
            `Error sending notification to courier ${courier.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error notifying couriers:", error);
  }
};

