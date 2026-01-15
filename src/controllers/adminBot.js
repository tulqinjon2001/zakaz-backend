import TelegramBot from "node-telegram-bot-api";
import prisma from "../services/prisma.js";
import { getAddressFromCoordinates, formatLocationLinks } from "../utils/geocoding.js";

let bot = null;

// Initialize admin bot (for admins)
export const initAdminBot = (token) => {
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
      // Check if user exists and has ADMIN role
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user) {
        await bot.sendMessage(
          chatId,
          `❌ Siz tizimda ro'yxatdan o'tmagansiz.\n\nAdmin huquqini olish uchun boshqa admin bilan bog'laning.`
        );
        return;
      }

      if (user.role !== "ADMIN") {
        await bot.sendMessage(
          chatId,
          `❌ Sizda admin huquqi yo'q.\n\nBu bot faqat adminlar uchun.`
        );
        return;
      }

      const adminPanelUrl = process.env.ADMIN_PANEL_URL || "http://localhost:5173";
      
      await bot.sendMessage(
        chatId,
        `👋 Xush kelibsiz, ${firstName}!\n\n` +
          `👨‍💼 *Siz ADMIN sifatida tizimga kirdingiz.*\n\n` +
          `📋 *Bu bot orqali:*\n` +
          `✅ Barcha buyurtmalarni kuzatishingiz\n` +
          `✅ Tizim statistikasini ko'rishingiz\n` +
          `✅ Xodimlarni boshqarishingiz mumkin\n\n` +
          `📊 *Buyruqlar:*\n` +
          `/start - Botni qayta ishga tushirish\n` +
          `/stats - Tizim statistikasi\n\n` +
          `💻 *Admin panel:* ${adminPanelUrl}\n\n` +
          `ℹ️ Yangi buyurtmalar haqida avtomatik xabarlar olasiz.`,
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

  // /stats command - show statistics
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { telegramId: String(userId) },
      });

      if (!user || user.role !== "ADMIN") {
        await bot.sendMessage(chatId, "❌ Sizda bu buyruqni bajarish huquqi yo'q.");
        return;
      }

      // Get statistics
      const totalOrders = await prisma.order.count();
      const pendingOrders = await prisma.order.count({
        where: { status: "PENDING" },
      });
      const completedOrders = await prisma.order.count({
        where: { status: "COMPLETED" },
      });
      const totalClients = await prisma.user.count({
        where: { role: "CLIENT" },
      });
      const totalProducts = await prisma.product.count();
      const totalStores = await prisma.store.count();

      const statsMessage = `
📊 Tizim statistikasi

📦 Buyurtmalar:
  • Jami: ${totalOrders}
  • Kutilmoqda: ${pendingOrders}
  • Yakunlangan: ${completedOrders}

👥 Foydalanuvchilar: ${totalClients}
📦 Mahsulotlar: ${totalProducts}
🏪 Do'konlar: ${totalStores}
      `.trim();

      await bot.sendMessage(chatId, statsMessage);
    } catch (error) {
      console.error("Error in /stats command:", error);
      await bot.sendMessage(
        chatId,
        "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      );
    }
  });

  // Error handler
  bot.on("polling_error", (error) => {
    console.error("Admin Bot polling error:", error);
  });

  console.log("✅ Admin Bot initialized successfully");
  return bot;
};

// Get bot instance
export const getAdminBot = () => {
  return bot;
};

// Send notification to admins about new order
export const notifyAdmins = async (orderData) => {
  if (!bot) {
    console.warn("Admin Bot not initialized. Notification not sent.");
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

    // Send to all admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
    });

    for (const admin of admins) {
      if (admin.telegramId) {
        try {
          await bot.sendMessage(admin.telegramId, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
          });
        } catch (error) {
          console.error(
            `Error sending notification to admin ${admin.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
};

