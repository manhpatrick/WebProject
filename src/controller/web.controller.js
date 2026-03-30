import Order from '../../models/order.model.js'
import User from '../../models/user.model.js'

export const getDashboardStats = async (req, res, next) => {
    try {
        // Lấy ngày bắt đầu của 7 ngày gần nhất
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        // 1. Tính doanh thu (không tính đơn hàng bị hủy)
        const revenueData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total_price' }
                }
            }
        ])

        const revenue = revenueData[0]?.totalRevenue || 0

        // 2. Đếm user mới
        const newUsersCount = await User.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        })

        // 3. Tính số sản phẩm bán được (tổng quantity)
        const productsSoldData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $unwind: '$order_items'
            },
            {
                $group: {
                    _id: null,
                    totalProductsSold: { $sum: '$order_items.quantity' }
                }
            }
        ])

        const productsSold = productsSoldData[0]?.totalProductsSold || 0

        // 4. Đếm số đơn hàng
        const ordersCount = await Order.countDocuments({
            createdAt: { $gte: sevenDaysAgo },
            status: { $ne: 'cancelled' }
        })

        res.status(200).json({
            success: true,
            data: {
                period: '7 ngày gần nhất',
                revenue: {
                    total: revenue,
                    formatted: `${revenue.toLocaleString('vi-VN')} VNĐ`
                },
                newUsers: newUsersCount,
                productsSold: productsSold,
                ordersCount: ordersCount
            }
        })
    } catch (error) {
        next(error)
    }
}
