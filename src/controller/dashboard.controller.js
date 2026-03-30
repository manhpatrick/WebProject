import Order from '../../models/order.model.js';
import User from '../../models/user.model.js';
import Product from '../../models/product.model.js';
import Payment from '../../models/payment.model.js';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'completed', 'failed'];
const DONE_ORDER_STATUSES = ['delivered'];

const toInt = (value, fallback, min, max) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
};

const getDateRange = (days) => {
    const safeDays = toInt(days, 7, 1, 365);
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    return { safeDays, start, end };
};

const getStatusMap = (items, statuses) => {
    const result = Object.fromEntries(statuses.map((status) => [status, 0]));
    items.forEach((item) => {
        const key = String(item._id || '').toLowerCase();
        if (Object.prototype.hasOwnProperty.call(result, key)) {
            result[key] = item.count;
        }
    });
    return result;
};

const getRevenueTotal = async (start, end) => {
    const data = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lte: end },
                status: { $in: DONE_ORDER_STATUSES }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$total_price' }
            }
        }
    ]);

    return data[0]?.totalRevenue || 0;
};

export const getDashboardStats = async (req, res, next) => {
    try {
        const { safeDays, start, end } = getDateRange(req.query.days);

        const [revenue, newUsersCount, productsSoldData, ordersCount] = await Promise.all([
            getRevenueTotal(start, end),
            User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end },
                        status: { $in: DONE_ORDER_STATUSES }
                    }
                },
                { $unwind: '$order_items' },
                {
                    $group: {
                        _id: null,
                        totalProductsSold: { $sum: '$order_items.quantity' }
                    }
                }
            ]),
            Order.countDocuments({
                createdAt: { $gte: start, $lte: end },
                status: { $in: DONE_ORDER_STATUSES }
            })
        ]);

        const productsSold = productsSoldData[0]?.totalProductsSold || 0;

        res.status(200).json({
            success: true,
            data: {
                period: `${safeDays} ngày gần nhất`,
                revenue: {
                    total: revenue,
                    formatted: `${revenue.toLocaleString('vi-VN')} VNĐ`
                },
                newUsers: newUsersCount,
                productsSold,
                ordersCount
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardOverview = async (req, res, next) => {
    try {
        const { safeDays, start, end } = getDateRange(req.query.days);

        const [
            totalUsers,
            totalProducts,
            totalOrders,
            totalPayments,
            periodRevenue,
            periodOrders,
            periodUsers,
            orderStatusRaw,
            paymentStatusRaw,
            recentOrders
        ] = await Promise.all([
            User.countDocuments(),
            Product.countDocuments(),
            Order.countDocuments(),
            Payment.countDocuments(),
            getRevenueTotal(start, end),
            Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            Order.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Payment.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Order.find({ createdAt: { $gte: start, $lte: end } })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('user', 'username email')
                .select('_id status total_price createdAt user')
        ]);

        const averageOrderValue = periodOrders > 0 ? Math.round(periodRevenue / periodOrders) : 0;

        res.status(200).json({
            success: true,
            data: {
                period: {
                    days: safeDays,
                    from: start,
                    to: end
                },
                totals: {
                    users: totalUsers,
                    products: totalProducts,
                    orders: totalOrders,
                    payments: totalPayments
                },
                periodMetrics: {
                    revenue: periodRevenue,
                    orders: periodOrders,
                    newUsers: periodUsers,
                    averageOrderValue
                },
                orderStatusBreakdown: getStatusMap(orderStatusRaw, ORDER_STATUSES),
                paymentStatusBreakdown: getStatusMap(paymentStatusRaw, PAYMENT_STATUSES),
                recentOrders
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardRevenueSeries = async (req, res, next) => {
    try {
        const { safeDays, start, end } = getDateRange(req.query.days);

        const rows = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: DONE_ORDER_STATUSES }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    revenue: { $sum: '$total_price' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        const lookup = new Map();
        rows.forEach((row) => {
            const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`;
            lookup.set(key, {
                revenue: row.revenue,
                orderCount: row.orderCount
            });
        });

        const series = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
            const point = lookup.get(key) || { revenue: 0, orderCount: 0 };
            series.push({
                date: key,
                revenue: point.revenue,
                orderCount: point.orderCount
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        res.status(200).json({
            success: true,
            data: {
                days: safeDays,
                series
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardOrderStatus = async (req, res, next) => {
    try {
        const { safeDays, start, end } = getDateRange(req.query.days);

        const rows = await Order.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                days: safeDays,
                statuses: getStatusMap(rows, ORDER_STATUSES)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardRecentOrders = async (req, res, next) => {
    try {
        const limit = toInt(req.query.limit, 10, 1, 50);
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('user', 'username email')
            .populate('address')
            .populate('order_items.product', 'name image')
            .select('_id status total_price createdAt user address order_items');

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

export const getDashboardTopProducts = async (req, res, next) => {
    try {
        const limit = toInt(req.query.limit, 5, 1, 30);
        const { start, end } = getDateRange(req.query.days);

        const topProducts = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: DONE_ORDER_STATUSES }
                }
            },
            { $unwind: '$order_items' },
            {
                $group: {
                    _id: '$order_items.product',
                    sold: { $sum: '$order_items.quantity' },
                    revenue: {
                        $sum: {
                            $multiply: ['$order_items.quantity', '$order_items.price']
                        }
                    }
                }
            },
            { $sort: { sold: -1, revenue: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: '$product._id',
                    name: '$product.name',
                    image: '$product.image',
                    stock: '$product.stock',
                    sold,
                    revenue
                }
            }
        ]);

        res.status(200).json({ success: true, data: topProducts });
    } catch (error) {
        next(error);
    }
};

export const getDashboardLowStockProducts = async (req, res, next) => {
    try {
        const threshold = toInt(req.query.threshold, 10, 0, 1000);
        const limit = toInt(req.query.limit, 10, 1, 100);

        const products = await Product.find({ stock: { $lte: threshold } })
            .sort({ stock: 1, sold_number: -1 })
            .limit(limit)
            .select('_id name image stock sold_number category');

        res.status(200).json({
            success: true,
            data: {
                threshold,
                count: products.length,
                products
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardUserGrowth = async (req, res, next) => {
    try {
        const { safeDays, start, end } = getDateRange(req.query.days);

        const rows = await User.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    users: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        const lookup = new Map();
        rows.forEach((row) => {
            const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`;
            lookup.set(key, row.users);
        });

        let cumulative = 0;
        const series = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
            const users = lookup.get(key) || 0;
            cumulative += users;
            series.push({ date: key, users, cumulative });
            cursor.setDate(cursor.getDate() + 1);
        }

        res.status(200).json({
            success: true,
            data: {
                days: safeDays,
                series
            }
        });
    } catch (error) {
        next(error);
    }
};
