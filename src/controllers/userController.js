import prisma from '../services/prisma.js';

// Create or get user by telegramId
export const createOrGetUser = async (req, res) => {
  try {
    const { telegramId, name, phone } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'TelegramId is required' });
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) },
    });

    if (user) {
      // Update if name or phone provided
      if (name || phone) {
        user = await prisma.user.update({
          where: { telegramId: String(telegramId) },
          data: {
            name: name || user.name,
            phone: phone || user.phone,
          },
        });
      }
      return res.json(user);
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        telegramId: String(telegramId),
        name,
        phone,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User with this telegramId already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get user by telegramId
export const getUserByTelegramId = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user by id
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    
    const where = {};
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        orders: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Create user
export const createUser = async (req, res) => {
  try {
    const { telegramId, name, phone, role } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'TelegramId is required' });
    }

    const validRoles = ['CLIENT', 'ADMIN', 'ORDER_RECEIVER', 'ORDER_PICKER', 'COURIER'];
    const userRole = role && validRoles.includes(role) ? role : 'CLIENT';

    const user = await prisma.user.create({
      data: {
        telegramId: String(telegramId),
        name: name || null,
        phone: phone || null,
        role: userRole,
      },
      include: {
        orders: {
          select: { id: true },
        },
      },
    });

    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User with this telegramId already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, telegramId, role } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (telegramId !== undefined) data.telegramId = String(telegramId);
    
    if (role !== undefined) {
      const validRoles = ['CLIENT', 'ADMIN', 'ORDER_RECEIVER', 'ORDER_PICKER', 'COURIER'];
      if (validRoles.includes(role)) {
        data.role = role;
      }
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      include: {
        orders: {
          select: { id: true },
        },
      },
    });

    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User with this telegramId already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Admin: Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
};