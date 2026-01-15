import prisma from '../services/prisma.js';
import { notifyAdmins } from './adminBot.js';
import { notifyReceivers } from './receiverBot.js';

// Client: Create order
export const createOrder = async (req, res) => {
  try {
    const { userId, storeId, items, address, location } = req.body;

    if (!userId || !storeId || !items || !Array.isArray(items)) {
      return res
        .status(400)
        .json({ error: 'UserId, storeId, and items array are required' });
    }

    // Calculate total price from items and enrich items with product info
    let totalPrice = 0;
    const enrichedItems = [];
    
    for (const item of items) {
      const inventory = await prisma.productInventory.findUnique({
        where: {
          productId_storeId: {
            productId: parseInt(item.productId),
            storeId: parseInt(storeId),
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      if (!inventory) {
        return res.status(400).json({
          error: `Product ${item.productId} not available in store ${storeId}`,
        });
      }

      const itemPrice = inventory.price * parseInt(item.quantity);
      totalPrice += itemPrice;

      // Enrich item with product name, code, and price info
      enrichedItems.push({
        productId: parseInt(item.productId),
        productName: inventory.product.name,
        productCode: inventory.product.code || null,
        quantity: parseInt(item.quantity),
        price: inventory.price,
        currency: inventory.currency || 'SUM',
        totalPrice: itemPrice,
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: parseInt(userId),
        storeId: parseInt(storeId),
        totalPrice,
        status: 'PENDING',
        items: enrichedItems,
        address: address || null,
        location: location || null,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        store: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    // Notify admins and receivers about new order
    try {
      // Notify admins (info only)
      await notifyAdmins(order);
      
      // Notify receivers (with accept/reject buttons)
      await notifyReceivers(order);
    } catch (notifyError) {
      console.error('Error notifying about new order:', notifyError);
      // Don't fail the order creation if notification fails
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Client: Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await prisma.order.findMany({
      where: {
        userId: parseInt(userId),
      },
      include: {
        store: {
          select: { id: true, name: true, address: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Client: Get single order
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        store: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId, note } = req.body;

    const validStatuses = [
      'PENDING',
      'ACCEPTED',
      'PREPARING',
      'READY_FOR_DELIVERY',
      'SHIPPING',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current order to update status history
    const currentOrder = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: { id: true, name: true, phone: true, telegramId: true },
        },
        store: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Build status history entry
    const statusHistory = currentOrder.statusHistory || [];
    statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      userId: userId || null,
      note: note || '',
    });

    // Determine which employee field to update based on status
    const updateData = {
      status,
      statusHistory,
    };

    if (status === 'ACCEPTED' && userId) {
      updateData.receiverId = parseInt(userId);
    } else if (status === 'PREPARING' && userId) {
      updateData.pickerId = parseInt(userId);
    } else if (status === 'SHIPPING' && userId) {
      updateData.courierId = parseInt(userId);
    }

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, phone: true, telegramId: true },
        },
        store: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    // Send notification to client
    try {
      await notifyStatusChange(order, status);
    } catch (notifyError) {
      console.error('Error sending notification:', notifyError);
      // Don't fail the status update if notification fails
    }

    res.json(order);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Send notification to client when status changes
const notifyStatusChange = async (order, status) => {
  const { sendMessageToClient } = await import('./clientBot.js');
  
  if (!order.user || !order.user.telegramId) {
    return;
  }

  const statusMessages = {
    'ACCEPTED': '✅ Buyurtmangiz qabul qilindi!\n\n📦 Buyurtma ID: #' + order.id + '\n\nBuyurtmangiz hozir tayyorlanmoqda.',
    'PREPARING': '📦 Buyurtmangiz yig\'ilmoqda!\n\n📦 Buyurtma ID: #' + order.id + '\n\nTez orada tayyor bo\'ladi.',
    'READY_FOR_DELIVERY': '✅ Buyurtmangiz tayyor!\n\n📦 Buyurtma ID: #' + order.id + '\n\nYaqin orada yetkazib beriladi.',
    'SHIPPING': '🚚 Buyurtmangiz yo\'lda!\n\n📦 Buyurtma ID: #' + order.id + '\n\nKuryerimiz sizga yetib keladi.',
    'COMPLETED': '🎉 Buyurtmangiz yakunlandi!\n\n📦 Buyurtma ID: #' + order.id + '\n\nXaridingiz uchun rahmat!',
    'CANCELLED': '❌ Buyurtmangiz bekor qilindi!\n\n📦 Buyurtma ID: #' + order.id + '\n\nQo\'shimcha ma\'lumot uchun bog\'laning.',
  };

  const message = statusMessages[status] || `Buyurtma holati o'zgartirildi: ${status}`;

  try {
    await sendMessageToClient(order.user.telegramId, message);
  } catch (error) {
    console.error('Error sending status notification to client:', error);
  }
};

// Admin: Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const { status, storeId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (storeId) where.storeId = parseInt(storeId);

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        store: {
          select: { id: true, name: true, address: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
