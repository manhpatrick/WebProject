import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    order_items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: [true, 'Bạn chưa nhập số lượng sản phẩm'],
            min: [1, 'Số lượng sản phẩm phải lớn hơn hoặc bằng 1']
        },
        price: {
            type: Number,
            required: [true, 'Bạn chưa nhập giá sản phẩm tại thời điểm đặt hàng'],
            min: [0, 'Giá sản phẩm phải lớn hơn hoặc bằng 0']
        }
    }],
    total_price: {
        type: Number,
        required: [true, 'Bạn chưa nhập tổng giá trị đơn hàng'],
        min: [0, 'Tổng giá trị đơn hàng phải lớn hơn hoặc bằng 0']
    }
}, { timestamps: true, versionKey: false });

const Order = mongoose.model('Order', orderSchema);
export default Order;