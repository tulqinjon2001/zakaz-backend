import prisma from '../services/prisma.js';

// Admin: Get all stores
export const getAllStores = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin & Client: Get single store
export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: parseInt(id) },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Create store
export const createStore = async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const store = await prisma.store.create({
      data: { name, address },
    });

    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update store
export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;

    const store = await prisma.store.update({
      where: { id: parseInt(id) },
      data: { name, address },
    });

    res.json(store);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Admin: Delete store
export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.store.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.status(500).json({ error: error.message });
  }
};
