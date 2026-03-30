import express from 'express'
import cookieParser from 'cookie-parser'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import errorMiddleware from './middleware/errorMiddleware.js'
import { connectDB } from './database/mongodb.js'
import { setServers } from "node:dns/promises";
setServers(["1.1.1.1", "8.8.8.8"]);
const app = express()
const PORT = process.env.PORT || 8000

// Connect to MongoDB
connectDB()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(express.static(path.join(__dirname, '../public')))

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'profile.html'))
})

// Routes 
app.use('/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found' })
})

app.use('/auth', (_req, res) => {
    res.status(404).json({ success: false, message: 'Auth endpoint not found' })
})

app.use(errorMiddleware)

app.listen(PORT, () => { 
    console.log(`Server running at http://localhost:${PORT}`)
})