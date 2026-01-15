import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Local database connection (from .env.local or default)
const localDbUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:tulqin@localhost:5432/mini_bot?schema=public';

// Railway database connection
const railwayDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:cVQztGIviTnYeipZZiVAyhWdUWLXUcLv@yamabiko.proxy.rlwy.net:22469/railway?schema=public';

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: localDbUrl,
    },
  },
});

const railwayPrisma = new PrismaClient({
  datasources: {
    db: {
      url: railwayDbUrl,
    },
  },
});

async function migrateData() {
  console.log('🚀 Starting data migration from local to Railway...\n');

  try {
    // 1. Migrate Users
    console.log('📦 Migrating Users...');
    const users = await localPrisma.user.findMany();
    const userMap = new Map(); // Map old user ID to new user ID
    for (const user of users) {
      const newUser = await railwayPrisma.user.upsert({
        where: { telegramId: user.telegramId },
        update: {
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        create: {
          telegramId: user.telegramId,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      });
      userMap.set(user.id, newUser.id);
    }
    console.log(`✅ Migrated ${users.length} users\n`);

    // 2. Migrate Stores
    console.log('📦 Migrating Stores...');
    const stores = await localPrisma.store.findMany();
    const storeMap = new Map();
    for (const store of stores) {
      const newStore = await railwayPrisma.store.upsert({
        where: { id: store.id },
        update: {
          name: store.name,
          address: store.address,
        },
        create: {
          id: store.id,
          name: store.name,
          address: store.address,
        },
      });
      storeMap.set(store.id, newStore.id);
    }
    console.log(`✅ Migrated ${stores.length} stores\n`);

    // 3. Migrate Categories
    console.log('📦 Migrating Categories...');
    const categories = await localPrisma.category.findMany();
    const categoryMap = new Map();
    for (const category of categories) {
      const newCategory = await railwayPrisma.category.upsert({
        where: { id: category.id },
        update: {
          name: category.name,
          parentId: category.parentId,
        },
        create: {
          id: category.id,
          name: category.name,
          parentId: category.parentId,
        },
      });
      categoryMap.set(category.id, newCategory.id);
    }
    console.log(`✅ Migrated ${categories.length} categories\n`);

    // 4. Migrate Products
    console.log('📦 Migrating Products...');
    const products = await localPrisma.product.findMany();
    const productMap = new Map();
    for (const product of products) {
      const newProduct = await railwayPrisma.product.upsert({
        where: { code: product.code },
        update: {
          name: product.name,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
        },
        create: {
          id: product.id,
          name: product.name,
          code: product.code,
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
        },
      });
      productMap.set(product.id, newProduct.id);
    }
    console.log(`✅ Migrated ${products.length} products\n`);

    // 5. Migrate Product Inventories
    console.log('📦 Migrating Product Inventories...');
    const inventories = await localPrisma.productInventory.findMany();
    for (const inventory of inventories) {
      await railwayPrisma.productInventory.upsert({
        where: {
          productId_storeId: {
            productId: inventory.productId,
            storeId: inventory.storeId,
          },
        },
        update: {
          price: inventory.price,
          currency: inventory.currency,
          stockCount: inventory.stockCount,
        },
        create: {
          productId: inventory.productId,
          storeId: inventory.storeId,
          price: inventory.price,
          currency: inventory.currency,
          stockCount: inventory.stockCount,
        },
      });
    }
    console.log(`✅ Migrated ${inventories.length} product inventories\n`);

    // 6. Migrate Orders
    console.log('📦 Migrating Orders...');
    const orders = await localPrisma.order.findMany();
    let migratedOrders = 0;
    for (const order of orders) {
      // Map old user ID to new user ID
      const newUserId = userMap.get(order.userId);
      if (!newUserId) {
        console.warn(`⚠️  Skipping order ${order.id}: user ${order.userId} not found`);
        continue;
      }

      // Map receiver, picker, courier IDs if they exist
      const newReceiverId = order.receiverId ? userMap.get(order.receiverId) : null;
      const newPickerId = order.pickerId ? userMap.get(order.pickerId) : null;
      const newCourierId = order.courierId ? userMap.get(order.courierId) : null;

      // Map store ID
      const newStoreId = storeMap.get(order.storeId);
      if (!newStoreId) {
        console.warn(`⚠️  Skipping order ${order.id}: store ${order.storeId} not found`);
        continue;
      }

      try {
        await railwayPrisma.order.upsert({
          where: { id: order.id },
          update: {
            userId: newUserId,
            storeId: newStoreId,
            totalPrice: order.totalPrice,
            status: order.status,
            items: order.items,
            address: order.address,
            location: order.location,
            receiverId: newReceiverId,
            pickerId: newPickerId,
            courierId: newCourierId,
            statusHistory: order.statusHistory,
          },
          create: {
            id: order.id,
            userId: newUserId,
            storeId: newStoreId,
            totalPrice: order.totalPrice,
            status: order.status,
            items: order.items,
            address: order.address,
            location: order.location,
            receiverId: newReceiverId,
            pickerId: newPickerId,
            courierId: newCourierId,
            statusHistory: order.statusHistory,
          },
        });
        migratedOrders++;
      } catch (error) {
        console.error(`❌ Error migrating order ${order.id}:`, error.message);
      }
    }
    console.log(`✅ Migrated ${migratedOrders}/${orders.length} orders\n`);

    console.log('🎉 Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await localPrisma.$disconnect();
    await railwayPrisma.$disconnect();
  }
}

// Run migration
migrateData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

