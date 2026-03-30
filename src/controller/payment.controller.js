import Payment from '../../models/payment.model.js'
import Order from '../../models/order.model.js'

const PAYMENT_STATUS_TRANSITIONS = {
    pending: ['completed', 'failed'],
    completed: [],
    failed: []
}

export const createPayment = async (req, res, next) => {
    try {
        const { order, payment_method } = req.body

        if (!order || !payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu order hoặc payment_method'
            })
        }

        const foundOrder = await Order.findById(order)
        if (!foundOrder) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' })
        }

        if (String(foundOrder.user) !== String(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Không có quyền thanh toán đơn hàng này' })
        }

        const existingPayment = await Payment.findOne({ order: foundOrder._id })
        if (existingPayment) {
            return res.status(409).json({
                success: false,
                message: 'Đơn hàng này đã được thanh toán',
                data: existingPayment
            })
        }

        const normalizedMethod = String(payment_method).trim().toUpperCase()
        const mappedMethod = {
            BANK: 'VNPAY',
            EWALLET: 'MOMO'
        }[normalizedMethod] || normalizedMethod

        if (!['COD', 'MOMO', 'VNPAY'].includes(mappedMethod)) {
            return res.status(400).json({
                success: false,
                message: 'payment_method không hợp lệ'
            })
        }

        const payment = await Payment.create({
            order: foundOrder._id,
            amount: foundOrder.total_price,
            payment_method: mappedMethod,
            status: 'pending',
            paid_at: null
        })

        const populatedPayment = await Payment.findById(payment._id).populate({
            path: 'order',
            select: 'user total_price status createdAt'
        })

        res.status(201).json({ success: true, data: populatedPayment })
    } catch (error) {
        next(error)
    }
}

export const getPayments = async (req, res, next) => {
    try {
        const orderFilter = req.query.order
        const filter = {}

        if (orderFilter) {
            filter.order = orderFilter
        }

        const payments = await Payment.find(filter)
            .populate({ path: 'order', select: 'user total_price status createdAt' })
            .sort({ createdAt: -1 })

        const visiblePayments = req.user.role === 'admin'
            ? payments
            : payments.filter((payment) => String(payment.order?.user) === String(req.user._id))

        res.status(200).json({ success: true, data: visiblePayments })
    } catch (error) {
        next(error)
    }
}

export const getPayment = async (req, res, next) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate({ path: 'order', select: 'user total_price status createdAt' })

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Thanh toán không tồn tại' })
        }

        if (req.user.role !== 'admin' && String(payment.order?.user) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập thanh toán này' })
        }

        res.status(200).json({ success: true, data: payment })
    } catch (error) {
        next(error)
    }
}

export const updatePaymentStatus = async (req, res, next) => {
    try {
        const { status } = req.body

        if (!status) {
            return res.status(400).json({ success: false, message: 'Thiếu trạng thái thanh toán' })
        }

        const nextStatus = String(status).trim().toLowerCase()
        if (!Object.prototype.hasOwnProperty.call(PAYMENT_STATUS_TRANSITIONS, nextStatus)) {
            return res.status(400).json({ success: false, message: 'Trạng thái thanh toán không hợp lệ' })
        }

        const payment = await Payment.findById(req.params.id)
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Thanh toán không tồn tại' })
        }

        const currentStatus = String(payment.status).toLowerCase()
        if (currentStatus === nextStatus) {
            return res.status(400).json({ success: false, message: 'Thanh toán đã ở trạng thái này' })
        }

        const allowedNextStatuses = PAYMENT_STATUS_TRANSITIONS[currentStatus] || []
        if (!allowedNextStatuses.includes(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: `Không thể chuyển trạng thái từ ${currentStatus} sang ${nextStatus}`
            })
        }

        payment.status = nextStatus
        if (nextStatus === 'completed') {
            payment.paid_at = new Date()
        }
        await payment.save()

        // If payment is completed, move order from pending to confirmed automatically.
        if (nextStatus === 'completed') {
            await Order.findOneAndUpdate(
                { _id: payment.order, status: 'pending' },
                { status: 'confirmed' },
                { new: true }
            )
        }

        const populatedPayment = await Payment.findById(payment._id).populate({
            path: 'order',
            select: 'user total_price status createdAt'
        })

        res.status(200).json({ success: true, data: populatedPayment })
    } catch (error) {
        next(error)
    }
}