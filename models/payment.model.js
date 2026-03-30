import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },

    amount: {
        type: Number,
        required: [true, 'Bạn chưa nhập số tiền thanh toán'],
        min: [0, 'Số tiền thanh toán phải lớn hơn hoặc bằng 0']
    },

    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },

    payment_method: {
        type: String,
        enum: ['COD', 'MOMO', 'VNPAY'],
        required: true
    },

    paid_at: {
        type: Date
    }

}, { timestamps: true, versionKey: false })

const Payment = mongoose.model('Payment', paymentSchema)
export default Payment