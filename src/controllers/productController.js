import prisma from '../services/prisma.js';

// Admin: Get all products
export const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventories: {
          include: {
            store: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get single product
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        inventories: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Create product with inventory
export const createProduct = async (req, res) => {
  try {
    const { name, code, imageUrl, categoryId, inventories } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Create product with inventories in a transaction
    const product = await prisma.product.create({
      data: {
        name,
        code,
        imageUrl,
        categoryId: categoryId ? parseInt(categoryId) : null,
        inventories: inventories
          ? {
              create: inventories.map((inv) => ({
                storeId: parseInt(inv.storeId),
                price: parseFloat(inv.price),
                currency: inv.currency || 'SUM',
                stockCount: parseInt(inv.stockCount || 0),
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        inventories: {
          include: {
            store: true,
          },
        },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Product code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, imageUrl, categoryId } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (categoryId !== undefined) {
      data.categoryId = categoryId ? parseInt(categoryId) : null;
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data,
      include: {
        category: true,
        inventories: {
          include: {
            store: true,
          },
        },
      },
    });

    res.json(product);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Product code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Admin: Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Client: Get products by store
export const getProductsByStore = async (req, res) => {
  try {
    const { storeId } = req.params;

    const products = await prisma.product.findMany({
      where: {
        inventories: {
          some: {
            storeId: parseInt(storeId),
          },
        },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventories: {
          where: {
            storeId: parseInt(storeId),
          },
          select: {
            id: true,
            price: true,
            currency: true,
            stockCount: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search products by name, code, or price
export const searchProducts = async (req, res) => {
  try {
    const { name, code, priceMin, priceMax, storeId } = req.query;

    const where = {};

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (code) {
      where.code = {
        contains: code,
        mode: 'insensitive',
      };
    }

    if (priceMin || priceMax || storeId) {
      where.inventories = {
        some: {},
      };

      if (storeId) {
        where.inventories.some.storeId = parseInt(storeId);
      }

      if (priceMin || priceMax) {
        where.inventories.some.price = {};
        if (priceMin) {
          where.inventories.some.price.gte = parseFloat(priceMin);
        }
        if (priceMax) {
          where.inventories.some.price.lte = parseFloat(priceMax);
        }
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventories: storeId
          ? {
              where: {
                storeId: parseInt(storeId),
              },
            }
          : {
              include: {
                store: {
                  select: { id: true, name: true },
                },
              },
            },
      },
      orderBy: { name: 'asc' },
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
