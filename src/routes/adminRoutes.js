import express from 'express';
import * as storeController from '../controllers/storeController.js';
import * as categoryController from '../controllers/categoryController.js';
import * as productController from '../controllers/productController.js';
import * as inventoryController from '../controllers/inventoryController.js';
import * as orderController from '../controllers/orderController.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// Store routes
router.get('/stores', storeController.getAllStores);
router.get('/stores/:id', storeController.getStoreById);
router.post('/stores', storeController.createStore);
router.put('/stores/:id', storeController.updateStore);
router.delete('/stores/:id', storeController.deleteStore);

// Category routes
router.get('/categories', categoryController.getAllCategories);
router.get('/categories/:id', categoryController.getCategoryById);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// Product routes
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Inventory routes
router.post('/inventories', inventoryController.createInventory);
router.put('/inventories/:id', inventoryController.updateInventory);
router.delete('/inventories/:id', inventoryController.deleteInventory);

// Order routes (admin)
router.get('/orders', orderController.getAllOrders);
router.get('/orders/:id', orderController.getOrderById);
router.put('/orders/:id/status', orderController.updateOrderStatus);

// User/Employee routes (admin)
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

export default router;
