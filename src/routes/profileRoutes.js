import express from "express"
import { getProfile, updateProfile, getAddresses, getAddress, createAddress, deleteAddress, updateAddress} from "../controller/profile.controller.js"
import { authMiddleware } from '../middleware/authMiddleware.js'

const route = express.Router()

route.get('/', authMiddleware, getProfile)

route.put('/', authMiddleware, updateProfile)

route.get('/address', authMiddleware, getAddresses)

route.get('/address/:id', authMiddleware, getAddress)

route.post('/address', authMiddleware, createAddress)

route.put('/address/:id', authMiddleware, updateAddress)

route.delete('/address/:id', authMiddleware, deleteAddress)

export default route

