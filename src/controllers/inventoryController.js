import prisma from '../services/prisma.js';

// Admin: Create inventory for a product
export const createInventory = async (req, res) => {
  try {
    const { productId, storeId, price, currency, stockCount } = req.body;

    if (!productId || !storeId || !price) {
      return res.status(400).json({
        error: 'ProductId, storeId, and price are required',
      });
    }

    const inventory = await prisma.productInventory.create({
      data: {
        productId: parseInt(productId),
        storeId: parseInt(storeId),
        price: parseFloat(price),
        currency: currency || 'SUM',
        stockCount: parseInt(stockCount || 0),
      },
      include: {
        product: {
          select: { id: true, name: true, code: true },
        },
        store: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(inventory);
  } catch (error) {
    if (error.code === 'P2002') {
      return res
        .status(400)
        .json({ error: 'Inventory for this product and store already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update inventory
export const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, currency, stockCount } = req.body;

    const data = {};
    if (price !== undefined) data.price = parseFloat(price);
    if (currency !== undefined) data.currency = currency;
    if (stockCount !== undefined) data.stockCount = parseInt(stockCount);

    const inventory = await prisma.productInventory.update({
      where: { id: parseInt(id) },
      data,
      include: {
        product: {
          select: { id: true, name: true, code: true },
        },
        store: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(inventory);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Admin: Delete inventory
export const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.productInventory.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Inventory deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    res.status(500).json({ error: error.message });
  }
};
