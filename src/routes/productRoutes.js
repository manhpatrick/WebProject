import express from 'express'
import { getProduct, createProduct, updateProduct, deleteProduct, getProductsByFilter } from '../controller/product.controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'

const route = express.Router()

route.get('/', getProductsByFilter)

route.get('/:id', getProduct)

route.post('/', authMiddleware, adminMiddleware, createProduct)

route.put('/:id', authMiddleware, adminMiddleware, updateProduct)

route.delete('/:id', authMiddleware, adminMiddleware, deleteProduct)

export default route