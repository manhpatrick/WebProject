import Product from '../../models/product.model.js'
import mongoose from 'mongoose'

const PAGE_SIZE = 10

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const VIETNAMESE_CHAR_GROUPS = {
    a: 'aAáàảãạăắằẳẵặâấầẩẫậÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ',
    d: 'dDđĐ',
    e: 'eEéèẻẽẹêếềểễệÉÈẺẼẸÊẾỀỂỄỆ',
    i: 'iIíìỉĩịÍÌỈĨỊ',
    o: 'oOóòỏõọôốồổỗộơớờởỡợÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ',
    u: 'uUúùủũụưứừửữựÚÙỦŨỤƯỨỪỬỮỰ',
    y: 'yYýỳỷỹỵÝỲỶỸỴ'
}

const toVietnameseInsensitiveRegex = (keyword) => {
    const normalized = String(keyword || '').trim()
    if (!normalized) return ''

    return normalized
        .split('')
        .map((char) => {
            if (/\s/.test(char)) return '\\s+'
            const lower = char.toLowerCase()
            const group = VIETNAMESE_CHAR_GROUPS[lower]
            if (group) return `[${group}]`
            return escapeRegex(char)
        })
        .join('')
}

const getPaginationParams = (query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = PAGE_SIZE
    const skip = (page - 1) * limit
    return { page, limit, skip }
}

const buildPaginationMeta = (page, limit, total) => {
    const totalPages = Math.ceil(total / limit)
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    }
}

export const getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) {
            const error = new Error("Product not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: product })
    } catch (error) {
        next(error)
    }
}

export const createProduct = async (req, res, next) => {
    try {
        const { name, price, old_price, brand, country, description, category, stock, review_count, rating_total } = req.body
        const image = req.file ? req.file.path : null
        const product = await Product.create({
            name,
            price,
            old_price,
            brand,
            country,
            description,
            category,
            stock,
            image,
            review_count,
            rating_total
        })
        res.status(201).json({
            success: true,
            data: product
        })
    } catch (error) {
        next(error)
    }
}

export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id)
        if (!product) {
            const error = new Error("Product not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, message: "Product deleted successfully" })
    } catch (error) {
        next(error)
    }
}

export const updateProduct = async (req, res, next) => {
    try {
        const { name, price, old_price, brand, country, description, category, stock, review_count, rating_total } = req.body
        const image = req.file ? req.file.path : null
        const product = await Product.findById(req.params.id)
        if (!product) {
            const error = new Error("Product not found")
            error.statusCode = 404
            return next(error)
        }

        product.name = name
        product.price = price
        product.old_price = old_price
        product.brand = brand
        product.country = country
        product.description = description
        product.category = category
        product.stock = stock

        if (image) {
            product.image = image
        }

        if (review_count !== undefined) {
            product.review_count = review_count
        }

        if (rating_total !== undefined) {
            product.rating_total = rating_total
        }

        await product.save()

        res.status(200).json({ success: true, data: product })
    } catch (error) {
        next(error)
    }
}

export const getProductsByFilter = async (req, res, next) => {
    try {
        const filter = {}
        const sort = {}
        const { page, limit, skip } = getPaginationParams(req.query)
        const { category, sortByPrice, sortBySold_number, sortByPopular, search } = req.query
        if (category) {
            filter.category = mongoose.Types.ObjectId.isValid(category)
                ? new mongoose.Types.ObjectId(category)
                : category
        }
        if (search) {
            filter.name = { $regex: toVietnameseInsensitiveRegex(search), $options: 'i' }
        }
        
        const normalizedSortByPrice = String(sortByPrice || '').trim().toLowerCase()
        if (normalizedSortByPrice === 'asc' || normalizedSortByPrice === '1') {
            sort.price = 1
        }
        if (normalizedSortByPrice === 'desc' || normalizedSortByPrice === '-1') {
            sort.price = -1
        }

        const normalizedSortBySoldNumber = String(sortBySold_number || '').trim().toLowerCase()
        if (normalizedSortBySoldNumber === 'asc' || normalizedSortBySoldNumber === '1') {
            sort.sold_number = 1
        }
        if (
            normalizedSortBySoldNumber === 'desc'
            || normalizedSortBySoldNumber === '-1'
            || normalizedSortBySoldNumber === 'true'
        ) {
            sort.sold_number = -1
        }

        const normalizedSortByPopular = String(sortByPopular || '').trim().toLowerCase()
        const shouldSortByPopular = (
            normalizedSortByPopular === 'desc'
            || normalizedSortByPopular === '-1'
            || normalizedSortByPopular === 'true'
            || normalizedSortByPopular === 'popular'
        )

        let products = []
        let total = 0

        if (shouldSortByPopular) {
            const [aggregateProducts, aggregateTotal] = await Promise.all([
                Product.aggregate([
                    { $match: filter },
                    {
                        $addFields: {
                            discount_percent: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gt: ['$old_price', 0] },
                                            { $gt: ['$old_price', '$price'] }
                                        ]
                                    },
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    { $subtract: ['$old_price', '$price'] },
                                                    '$old_price'
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    0
                                ]
                            }
                        }
                    },
                    { $sort: { discount_percent: -1, _id: 1 } },
                    { $skip: skip },
                    { $limit: limit }
                ]),
                Product.countDocuments(filter)
            ])

            products = aggregateProducts
            total = aggregateTotal
        } else {
            const [findProducts, findTotal] = await Promise.all([
                Product.find(filter).sort(sort).skip(skip).limit(limit),
                Product.countDocuments(filter)
            ])

            products = findProducts
            total = findTotal
        }

        res.status(200).json({
            success: true,
            data: products,
            pagination: buildPaginationMeta(page, limit, total)
        })
    } catch (error) {
        next(error)
    }
}


