import express from 'express'
import {
	getDashboardStats,
	getDashboardOverview,
	getDashboardRevenueSeries,
	getDashboardOrderStatus,
	getDashboardRecentOrders,
	getDashboardTopProducts,
	getDashboardLowStockProducts,
	getDashboardUserGrowth
} from '../controller/dashboard.controller.js'
import {
	getCategories,
	getCategory,
	createCategory,
	updateCategory,
	deleteCategory
} from '../controller/category.controller.js'
import {
	getProductsByFilter,
	getProduct,
	createProduct,
	updateProduct,
	deleteProduct
} from '../controller/product.controller.js'
import authMiddleware from '../middleware/authMiddleware.js'
import adminMiddleware from '../middleware/adminMiddleware.js'

const router = express.Router()

router.get('/stats', authMiddleware, adminMiddleware, getDashboardStats)
router.get('/overview', authMiddleware, adminMiddleware, getDashboardOverview)
router.get('/revenue-series', authMiddleware, adminMiddleware, getDashboardRevenueSeries)
router.get('/order-status', authMiddleware, adminMiddleware, getDashboardOrderStatus)
router.get('/recent-orders', authMiddleware, adminMiddleware, getDashboardRecentOrders)
router.get('/top-products', authMiddleware, adminMiddleware, getDashboardTopProducts)
router.get('/low-stock', authMiddleware, adminMiddleware, getDashboardLowStockProducts)
router.get('/user-growth', authMiddleware, adminMiddleware, getDashboardUserGrowth)

// Category management for admin dashboard
router.get('/categories', authMiddleware, adminMiddleware, getCategories)
router.get('/categories/:id', authMiddleware, adminMiddleware, getCategory)
router.post('/categories', authMiddleware, adminMiddleware, createCategory)
router.put('/categories/:id', authMiddleware, adminMiddleware, updateCategory)
router.delete('/categories/:id', authMiddleware, adminMiddleware, deleteCategory)

// Product management for admin dashboard
router.get('/products', authMiddleware, adminMiddleware, getProductsByFilter)
router.get('/products/:id', authMiddleware, adminMiddleware, getProduct)
router.post('/products', authMiddleware, adminMiddleware, createProduct)
router.put('/products/:id', authMiddleware, adminMiddleware, updateProduct)
router.delete('/products/:id', authMiddleware, adminMiddleware, deleteProduct)

export default router
