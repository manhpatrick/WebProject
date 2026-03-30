import Order from '../../models/order.model.js';
import Product from '../../models/product.model.js';
import Address from '../../models/address.model.js';
import Payment from '../../models/payment.model.js';
import CartItem from '../../models/cart_item.model.js';

const ORDER_STATUS_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
}

const normalizeOrderStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'completed' || normalized === 'done') {
        return 'delivered'
    }
    return normalized
}

const isDoneOrderStatus = (status) => ['delivered', 'completed', 'done'].includes(String(status || '').toLowerCase())

export const getOrders = async (req, res, next) => {
    try {
        const filter = req.user?.role === 'admin' ? {} : { user: req.user?._id }
        const orders = await Order.find(filter)
            .populate('user', 'username email role')
            .populate('order_items.product')
            .sort({ createdAt: -1 })
        res.status(200).json({ success: true, data: orders })
    } catch (error) {
        next(error)
    }
}

export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'username email role')
            .populate('order_items.product')
        if(!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' })
        }

        if (req.user?.role !== 'admin' && String(order.user?._id || order.user) !== String(req.user?._id)) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập đơn hàng này' })
        }

        res.status(200).json({ success: true, data: order }
        )
    } catch (error) {
        next(error)
    }
}

export const createOrder = async (req, res, next) => {
    try {
        const { address, phone, cart_item_ids } = req.body

        if (!address) {
            return res.status(400).json({ success: false, message: 'Thiếu địa chỉ giao hàng' })
        }

        const userAddress = await Address.findOne({ _id: address, user: req.user._id }).select('_id')
        if (!userAddress) {
            return res.status(403).json({ success: false, message: 'Địa chỉ không hợp lệ hoặc không thuộc tài khoản của bạn' })
        }

        const cartFilter = { user: req.user._id }
        if (Array.isArray(cart_item_ids) && cart_item_ids.length > 0) {
            cartFilter._id = { $in: cart_item_ids }
        }

        const cartItems = await CartItem.find(cartFilter)
            .populate('product', '_id price stock')

        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống hoặc sản phẩm đã chọn không hợp lệ' })
        }

        const hasInvalidItem = cartItems.some((item) => {
            const quantity = Number(item.quantity)
            return !item.product || !Number.isFinite(quantity) || quantity < 1
        })

        if (hasInvalidItem) {
            return res.status(400).json({ success: false, message: 'Dữ liệu giỏ hàng không hợp lệ' })
        }

        const normalizedOrderItems = []
        for (const item of cartItems) {
            const product = item.product
            const quantity = Number(item.quantity)

            if (!product) {
                return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' })
            }

            if (quantity > product.stock) {
                return res.status(400).json({ success: false, message: 'Số lượng vượt quá tồn kho' })
            }

            normalizedOrderItems.push({
                product: product._id,
                quantity,
                price: product.price
            })
        }

        const total_price = normalizedOrderItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity)
        }, 0)

        const order = await Order.create({
            user: req.user._id,
            address,
            order_items: normalizedOrderItems,
            total_price,
            phone
        })

        // Trừ tồn kho cho từng sản phẩm
        await Promise.all(normalizedOrderItems.map((item) => {
            return Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } },
                { new: true }
            )
        }))

        await CartItem.deleteMany({ _id: { $in: cartItems.map((item) => item._id) }, user: req.user._id })

        res.status(201).json({ success: true, data: order })
    } catch (error) {
        next(error)
    }
}

export const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body

        if (!status) {
            return res.status(400).json({ success: false, message: 'Thiếu trạng thái đơn hàng' })
        }

        const nextStatus = normalizeOrderStatus(status)
        if (!Object.prototype.hasOwnProperty.call(ORDER_STATUS_TRANSITIONS, nextStatus)) {
            return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' })
        }

        const order = await Order.findById(req.params.id)

        if (!order) {
            return res.status(404).json({ success: false, message: 'Don hang khong ton tai' })
        }

        const currentStatus = normalizeOrderStatus(order.status)

        if (['delivered', 'cancelled'].includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã completed hoặc cancelled, không thể chỉnh sửa thêm'
            })
        }

        if (currentStatus === nextStatus) {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã ở trạng thái này' })
        }

        const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus] || []
        if (!allowedNextStatuses.includes(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: `Không thể chuyển trạng thái từ ${currentStatus} sang ${nextStatus}`
            })
        }
        
        if (!isDoneOrderStatus(currentStatus) && isDoneOrderStatus(nextStatus)) {
            await Promise.all(order.order_items.map((item) => {
                return Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { sold_number: item.quantity } },
                    { new: true }
                )
            }))
        }

        order.status = nextStatus
        await order.save()

        res.status(200).json({ success: true, data: order })
    } catch (error) {
        next(error)
    }
}

export const deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id)

        if (!order) {
            return res.status(404).json({ success: false, message: 'Don hang khong ton tai' })
        }

        res.status(200).json({ success: true, message: 'Xoa don hang thanh cong' })
    } catch (error) {
        next(error)
    }
}

export const cancelMyOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)

        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' })
        }

        const isOwner = String(order.user) === String(req.user._id)
        const isAdmin = req.user.role === 'admin'
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Không có quyền hủy đơn hàng này' })
        }

        const currentStatus = normalizeOrderStatus(order.status)
        if (!['pending', 'confirmed'].includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: `Không thể hủy đơn hàng ở trạng thái ${currentStatus}`
            })
        }

        const payment = await Payment.findOne({ order: order._id })
        if (payment) {
            const paymentStatus = String(payment.status).toLowerCase()
            if (paymentStatus === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn hàng đã thanh toán thành công, vui lòng dùng luồng hoàn tiền'
                })
            }

            if (paymentStatus === 'pending') {
                payment.status = 'failed'
                payment.paid_at = null
                await payment.save()
            }
        }

        // Cộng lại tồn kho khi hủy đơn hàng
        for (const item of order.order_items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                { new: true }
            )
        }

        order.status = 'cancelled'
        await order.save()

        res.status(200).json({
            success: true,
            message: 'Hủy đơn hàng thành công',
            data: {
                order,
                payment
            }
        })
    } catch (error) {
        next(error)
    }
}

export const markOrderDeliveredByUser = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)

        if (!order) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' })
        }

        const isOwner = String(order.user) === String(req.user._id)
        const isAdmin = req.user.role === 'admin'
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Không có quyền cập nhật đơn hàng này' })
        }

        const currentStatus = normalizeOrderStatus(order.status)
        if (currentStatus !== 'shipped') {
            return res.status(400).json({
                success: false,
                message: `Chỉ có thể xác nhận nhận hàng khi đơn ở trạng thái shipped, hiện tại: ${currentStatus}`
            })
        }

        if (!isDoneOrderStatus(currentStatus)) {
            await Promise.all(order.order_items.map((item) => {
                return Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { sold_number: item.quantity } },
                    { new: true }
                )
            }))
        }

        order.status = 'delivered'
        await order.save()

        res.status(200).json({
            success: true,
            message: 'Xác nhận nhận hàng thành công',
            data: order
        })
    } catch (error) {
        next(error)
    }
}
