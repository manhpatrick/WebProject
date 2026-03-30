import express from "express"
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'
import { createPayment, getPayment, getPayments, updatePaymentStatus } from '../controller/payment.controller.js'

const route = express.Router()

route.get('/', authMiddleware, getPayments)

route.get('/:id', authMiddleware, getPayment)

route.post('/', authMiddleware, createPayment)

route.put('/:id/status', authMiddleware, adminMiddleware, updatePaymentStatus)

export default route
