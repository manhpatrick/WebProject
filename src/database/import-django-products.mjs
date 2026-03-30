import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { setServers } from 'node:dns/promises';
import { connectDB } from './mongodb.js';
import Category from '../../models/category.model.js';
import Product from '../../models/product.model.js';

const INPUT_FILE = process.argv[2] || 'tmp_django_products.json';

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const normalizeText = (value, fallback = '') => {
    const text = String(value ?? '').trim();
    return text || fallback;
};

const normalizeTextMax = (value, fallback, maxLength) => {
    const text = normalizeText(value, fallback);
    if (!maxLength || text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength).trim();
};

const normalizeImage = (value) => {
    const raw = normalizeText(value, '');
    if (!raw) return 'static/image/adidas3_yU6oRwT.jpeg';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('static/')) {
        return raw;
    }
    if (raw.startsWith('products/') || raw.startsWith('media/')) {
        return raw;
    }
    return `products/${raw}`;
};

const main = async () => {
    const absolutePath = path.resolve(process.cwd(), INPUT_FILE);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Không tìm thấy file dữ liệu: ${absolutePath}`);
    }

    const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    const products = Array.isArray(payload.products) ? payload.products : [];

    if (products.length === 0) {
        throw new Error('Không có dữ liệu sản phẩm để import');
    }

    setServers(['1.1.1.1', '8.8.8.8']);
    await connectDB();

    const categoryIdByName = new Map();
    for (const cat of categories) {
        const name = normalizeText(cat.name);
        if (!name) continue;

        let categoryDoc = await Category.findOne({ name });
        if (!categoryDoc) {
            categoryDoc = await Category.create({ name });
        }
        categoryIdByName.set(name, categoryDoc._id);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of products) {
        const name = normalizeText(item.name);
        const categoryName = normalizeText(item.category_name, 'Khác');

        if (!name) {
            skipped += 1;
            continue;
        }

        let categoryId = categoryIdByName.get(categoryName);
        if (!categoryId) {
            const fallbackCategory = await Category.findOneAndUpdate(
                { name: categoryName },
                { name: categoryName },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            categoryId = fallbackCategory._id;
            categoryIdByName.set(categoryName, categoryId);
        }

        const productPayload = {
            name: normalizeTextMax(name, 'Sản phẩm', 100),
            price: toNumber(item.price, 0),
            old_price: toNumber(item.old_price, 0),
            brand: normalizeTextMax(item.brand, 'Unknown', 100),
            country: normalizeTextMax(item.country, 'Unknown', 100),
            description: normalizeTextMax(item.description, '', 200),
            category: categoryId,
            stock: toNumber(item.stock, 0),
            sold_number: toNumber(item.sold_number, 0),
            image: normalizeImage(item.image),
            rating: toNumber(item.rating, 5),
            review_count: toNumber(item.review_count, 0),
            rating_total: toNumber(item.rating_total, 0)
        };

        const existing = await Product.findOne({ name: productPayload.name }).select('_id');
        if (existing) {
            const doc = await Product.findById(existing._id);
            Object.assign(doc, productPayload);
            await doc.save();
            updated += 1;
        } else {
            await Product.create(productPayload);
            inserted += 1;
        }
    }

    console.log(JSON.stringify({
        inputCategories: categories.length,
        inputProducts: products.length,
        inserted,
        updated,
        skipped
    }));

    await mongoose.connection.close();
};

main().catch(async (error) => {
    console.error(error?.stack || error?.message || error);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
    process.exit(1);
});
