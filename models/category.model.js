import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Bạn chưa nhập tên danh mục'],
        trim: true,
        unique: true,
        minlength: [2, 'Tên danh mục phải có ít nhất 2 ký tự'],
        maxlength: [50, 'Tên danh mục không được vượt quá 50 ký tự']
    },
}, { timestamps: true, versionKey: false });

const Category = mongoose.model('Category', categorySchema);
export default Category;