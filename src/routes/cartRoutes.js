import express from 'express'
import { addProductToCart, getCartItems, removeProductFromCart, updateCartItemQuantity } from '../controller/cart.controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const route = express.Router()

route.get('/', authMiddleware, getCartItems)

route.post('/:id', authMiddleware, addProductToCart)

route.put('/:id', authMiddleware, updateCartItemQuantity)

route.delete('/:id', authMiddleware, removeProductFromCart)

export default route