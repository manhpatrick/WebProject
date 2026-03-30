import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Bạn chưa nhập tên sản phẩm'],
        trim: true,
        unique: true,
        minlength: [2, 'Tên sản phẩm phải có ít nhất 2 ký tự'],
        maxlength: [100, 'Tên sản phẩm không được vượt quá 100 ký tự']
    },
    price: {
        type: Number,
        required: [true, 'Bạn chưa nhập giá sản phẩm'],
        min: [0, 'Giá sản phẩm phải lớn hơn hoặc bằng 0']
    },
    old_price: {
        type: Number,
        min: [0, 'Giá cũ phải lớn hơn hoặc bằng 0']
    },
    brand: {
        type: String,
        trim: true,
        required: [true, 'Bạn chưa nhập thương hiệu sản phẩm'],
        maxlength: [100, 'Thuong hieu khong duoc vuot qua 100 ky tu']
    },
    country: {
        type: String,
        trim: true,
        required: [true, 'Bạn chưa nhập quốc gia sản xuất'],
        maxlength: [100, 'Quoc gia khong duoc vuot qua 100 ky tu']
    },
    description: {
        type: String,
        maxlength: [200, 'Mô tả sản phẩm không được vượt quá 200 ký tự']
    },
    category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: [true, 'Bạn chưa nhập danh mục sản phẩm'],
    },
    sold_number:{
        type: Number,
        default: 0,
        min: [0, 'Số lượng đã bán phải lớn hơn hoặc bằng 0']
    },
    stock: {
        type: Number,
        required: [true, 'Bạn chưa nhập số lượng sản phẩm'],
        min: [0, 'Số lượng sản phẩm phải lớn hơn hoặc bằng 0']
    },
    image: {
        type: String,
    },
    rating: {
        type: Number,
        default: 5,
        min: [0, 'Đánh giá phải lớn hơn hoặc bằng 0'],
        max: [5, 'Đánh giá không được vượt quá 5']
    },
    review_count: {
        type: Number,
        default: 0,
        min: [0, 'Số lượt review phải lớn hơn hoặc bằng 0']
    },
    rating_total: {
        type: Number,
        default: 0,
        min: [0, 'Tổng điểm đánh giá phải lớn hơn hoặc bằng 0']
    }
}, { timestamps: true, versionKey: false });

productSchema.pre('validate', function () {
    const reviewCount = Number(this.review_count || 0)
    const ratingTotal = Number(this.rating_total || 0)

    if (reviewCount > 0) {
        this.rating = Number((ratingTotal / reviewCount).toFixed(1))
    } else if (!this.rating) {
        this.rating = 5
    }
})

const Product = mongoose.model('Product', productSchema);
export default Product;