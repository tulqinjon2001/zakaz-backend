import express from 'express';
import * as storeController from '../controllers/storeController.js';
import * as categoryController from '../controllers/categoryController.js';
import * as productController from '../controllers/productController.js';
import * as orderController from '../controllers/orderController.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// Store routes (client)
router.get('/stores', storeController.getAllStores);
router.get('/stores/:id', storeController.getStoreById);

// Category routes (client)
router.get('/categories', categoryController.getAllCategories);
router.get('/categories/:id', categoryController.getCategoryById);

// Product routes (client)
router.get('/stores/:storeId/products', productController.getProductsByStore);

// Search route
router.get('/products/search', productController.searchProducts);

// Order routes (client)
router.post('/orders', orderController.createOrder);
router.get('/users/:userId/orders', orderController.getUserOrders);
router.get('/orders/:id', orderController.getOrderById);

// User routes (client)
router.post('/users', userController.createOrGetUser);
router.get('/users/telegram/:telegramId', userController.getUserByTelegramId);
router.get('/users/:id', userController.getUserById);

export default router;
