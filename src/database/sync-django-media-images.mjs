import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { setServers } from 'node:dns/promises';
import { connectDB } from './mongodb.js';
import Product from '../../models/product.model.js';

const TEMPLATE_IMAGE = 'static/image/adidas3_yU6oRwT.jpeg';
const SHARED_IMAGES_TO_DELETE = [
    'products/adidas3.jpeg',
    'products/adidas3_yU6oRwT.jpeg',
    'static/image/adidas3_yU6oRwT.jpeg'
];
const FALLBACK_IMAGE_BY_FILE = {
    'adidas1.jpg': 'adidas3.jpeg',
    'adidas2.jpg': 'adidas4.jpeg'
};

const normalizeInputImage = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return path.basename(raw);
};

const main = async () => {
    const inputJsonPath = path.resolve(process.cwd(), process.argv[2] || 'tmp_django_products.json');
    const sourceMediaDirs = [
        path.resolve(
            process.cwd(),
            process.argv[3] || '..\\..\\Documents\\PYTHON_WEBSITE1-main\\web_django\\media\\products'
        ),
        path.resolve(process.cwd(), '..\\..\\Documents\\PYTHON_WEBSITE1-main\\web_django\\media')
    ];
    const targetPublicDir = path.resolve(process.cwd(), 'public', 'products');

    if (!fs.existsSync(inputJsonPath)) {
        throw new Error(`Khong tim thay file JSON: ${inputJsonPath}`);
    }

    if (!fs.existsSync(sourceMediaDirs[0])) {
        throw new Error(`Khong tim thay thu muc media/products: ${sourceMediaDirs[0]}`);
    }

    fs.mkdirSync(targetPublicDir, { recursive: true });

    const copiedFiles = new Set();
    for (const sourceDir of sourceMediaDirs) {
        if (!fs.existsSync(sourceDir)) {
            continue;
        }

        for (const fileName of fs.readdirSync(sourceDir)) {
            const sourceFile = path.join(sourceDir, fileName);
            const targetFile = path.join(targetPublicDir, fileName);

            if (!fs.statSync(sourceFile).isFile()) continue;
            fs.copyFileSync(sourceFile, targetFile);
            copiedFiles.add(fileName);
        }
    }

    const payload = JSON.parse(fs.readFileSync(inputJsonPath, 'utf8'));
    const products = Array.isArray(payload.products) ? payload.products : [];

    setServers(['1.1.1.1', '8.8.8.8']);
    await connectDB();

    let updatedImages = 0;
    let missingImages = 0;
    const missingImageProducts = [];

    for (const item of products) {
        const name = String(item?.name ?? '').trim();
        const imageFile = normalizeInputImage(item?.image);

        if (!name || !imageFile) {
            continue;
        }

        let resolvedFile = imageFile;
        if (!copiedFiles.has(imageFile)) {
            const fallbackFile = FALLBACK_IMAGE_BY_FILE[imageFile];
            if (fallbackFile && copiedFiles.has(fallbackFile)) {
                resolvedFile = fallbackFile;
            } else {
                missingImages += 1;
                missingImageProducts.push({ name, imageFile });
                continue;
            }
        }

        const imagePath = `products/${resolvedFile}`;
        const result = await Product.updateOne({ name }, { $set: { image: imagePath } });
        if (result.modifiedCount > 0 || result.matchedCount > 0) {
            updatedImages += 1;
        }
    }

    const deleted = await Product.deleteMany({ image: TEMPLATE_IMAGE });
    const remainingTemplateProducts = await Product.countDocuments({ image: TEMPLATE_IMAGE });
    const deletedShared = await Product.deleteMany({ image: { $in: SHARED_IMAGES_TO_DELETE } });

    console.log(
        JSON.stringify({
            copiedFiles: copiedFiles.size,
            updatedImages,
            missingImages,
            missingImageProducts,
            deletedTemplateProducts: deleted.deletedCount || 0,
            remainingTemplateProducts,
            deletedSharedImageProducts: deletedShared.deletedCount || 0,
            targetPublicDir
        })
    );

    await mongoose.connection.close();
};

main().catch(async (error) => {
    console.error(error?.stack || error?.message || error);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
    process.exit(1);
});
