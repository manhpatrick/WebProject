export const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        const error = new Error('Access denied. Admins only.');
        error.statusCode = 403;
        next(error);
    }
};

export default adminMiddleware;