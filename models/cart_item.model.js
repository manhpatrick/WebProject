import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: [true, 'Bạn chưa nhập số lượng sản phẩm'],
        min: [1, 'Số lượng sản phẩm phải lớn hơn hoặc bằng 1']
    }
}, { timestamps: true, versionKey: false });

const CartItem = mongoose.model('CartItem', cartItemSchema);
export default CartItem;
