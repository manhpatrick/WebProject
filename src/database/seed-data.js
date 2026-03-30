import bcrypt from 'bcryptjs'
import { setServers } from 'node:dns/promises'
import { connectDB } from './mongodb.js'
import mongoose from 'mongoose'
import User from '../../models/user.model.js'
import Category from '../../models/category.model.js'
import Product from '../../models/product.model.js'

const DEFAULT_IMAGE = 'static/image/adidas3_yU6oRwT.jpeg'

const seedUsers = [
    {
        username: 'Admin 01',
        email: 'admin1@gmail.com',
        password: 'Admin1@gmail.com',
        role: 'admin',
        gender: 'Nam'
    },
    {
        username: 'Nguyen Van A',
        email: 'user1@gmail.com',
        password: 'User1@123',
        role: 'user',
        gender: 'Nam'
    },
    {
        username: 'Tran Thi B',
        email: 'user2@gmail.com',
        password: 'User2@123',
        role: 'user',
        gender: 'Nữ'
    }
]

const seedCategoryNames = [
    'Giay the thao',
    'Ao the thao',
    'Quan the thao',
    'Phu kien'
]

const seedProducts = [
    {
        name: 'Giay Chay Bo Pro X',
        price: 1290000,
        old_price: 1890000,
        stock: 50,
        sold_number: 35,
        brand: 'Adidas',
        country: 'Viet Nam',
        category: 'Giay the thao',
        description: 'Giay chay bo nhe va ben',
        review_count: 128,
        rating_total: 576
    },
    {
        name: 'Ao Training Dryfit',
        price: 390000,
        old_price: 690000,
        stock: 80,
        sold_number: 48,
        brand: 'Nike',
        country: 'Thai Lan',
        category: 'Ao the thao',
        description: 'Ao thoang khi cho tap luyen',
        review_count: 95,
        rating_total: 447
    },
    {
        name: 'Quan Short Active',
        price: 320000,
        old_price: 520000,
        stock: 65,
        sold_number: 29,
        brand: 'Puma',
        country: 'Indonesia',
        category: 'Quan the thao',
        description: 'Quan short co gian tot',
        review_count: 74,
        rating_total: 311
    },
    {
        name: 'Tat The Thao Chong Tron',
        price: 99000,
        old_price: 149000,
        stock: 150,
        sold_number: 70,
        brand: 'Asics',
        country: 'Viet Nam',
        category: 'Phu kien',
        description: 'Tat co do bam chan cao',
        review_count: 166,
        rating_total: 813
    },
    {
        name: 'Giay Tap Gym Flex',
        price: 990000,
        old_price: 1790000,
        stock: 40,
        sold_number: 22,
        brand: 'Under Armour',
        country: 'My',
        category: 'Giay the thao',
        description: 'Giay tap gym on dinh',
        review_count: 51,
        rating_total: 245
    },
    {
        name: 'Binh Nuoc Sport 1L',
        price: 149000,
        old_price: 299000,
        stock: 120,
        sold_number: 54,
        brand: 'Decathlon',
        country: 'Phap',
        category: 'Phu kien',
        description: 'Binh nuoc dung tich lon',
        review_count: 83,
        rating_total: 357
    }
]

const calculateAverageRating = (reviewCount, ratingTotal) => {
    if (!reviewCount) return 5
    return Number((Number(ratingTotal || 0) / Number(reviewCount || 1)).toFixed(1))
}

const seed = async () => {
    setServers(['1.1.1.1', '8.8.8.8'])
    await connectDB()

    const categoryIdByName = new Map()

    for (const categoryName of seedCategoryNames) {
        let category = await Category.findOne({ name: categoryName })
        if (!category) {
            category = await Category.create({ name: categoryName })
        }
        categoryIdByName.set(categoryName, category._id)
    }

    for (const userData of seedUsers) {
        const existing = await User.findOne({ email: userData.email })
        if (!existing) {
            const hashed = await bcrypt.hash(userData.password, 10)
            await User.create({
                username: userData.username,
                email: userData.email,
                password: hashed,
                role: userData.role,
                gender: userData.gender
            })
        }
    }

    for (const productData of seedProducts) {
        const categoryId = categoryIdByName.get(productData.category)
        if (!categoryId) continue

        await Product.findOneAndUpdate(
            { name: productData.name },
            {
                name: productData.name,
                price: productData.price,
                old_price: productData.old_price,
                stock: productData.stock,
                sold_number: productData.sold_number,
                brand: productData.brand,
                country: productData.country,
                description: productData.description,
                category: categoryId,
                image: DEFAULT_IMAGE,
                review_count: productData.review_count,
                rating_total: productData.rating_total,
                rating: calculateAverageRating(productData.review_count, productData.rating_total)
            },
            {
                upsert: true,
                returnDocument: 'after',
                setDefaultsOnInsert: true
            }
        )
    }

    console.log('Seed completed successfully')
    await mongoose.connection.close()
}

seed().catch(async (error) => {
    console.error('Seed failed:', error)
    await mongoose.connection.close()
    process.exit(1)
})
