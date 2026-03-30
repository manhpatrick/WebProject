import express from 'express'
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../controller/category.controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'

const route = express.Router()

route.get('/', getCategories)

route.get('/:id', getCategory)

route.post('/', authMiddleware, adminMiddleware, createCategory)

route.put('/:id', authMiddleware, adminMiddleware, updateCategory)

route.delete('/:id', authMiddleware, adminMiddleware, deleteCategory)

export default route