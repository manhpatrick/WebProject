import express from 'express'
import { getOrders, getOrder, createOrder, updateOrderStatus, deleteOrder, cancelMyOrder, markOrderDeliveredByUser } from '../controller/order.controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'
const route = express.Router()

route.get('/', authMiddleware, getOrders)

route.get('/:id', authMiddleware, getOrder)

route.post('/', authMiddleware, createOrder)

route.patch('/:id/cancel', authMiddleware, cancelMyOrder)

route.patch('/:id/received', authMiddleware, markOrderDeliveredByUser)

route.put('/:id', authMiddleware, adminMiddleware, updateOrderStatus)

route.delete('/:id', authMiddleware, adminMiddleware, deleteOrder)

export default route