import express from 'express'
import { getUsers, getUser, deleteUser, updateUser, createUser } from '../controller/user.controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { adminMiddleware } from '../middleware/adminMiddleware.js'

const route = express.Router()
 
route.get('/', authMiddleware, adminMiddleware, getUsers)

route.get('/:id', authMiddleware, adminMiddleware, getUser);
    
route.post('/', authMiddleware, adminMiddleware, createUser);

route.put('/:id', authMiddleware, adminMiddleware, updateUser);

route.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

export default route