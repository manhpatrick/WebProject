import CartItem from "../../models/cart_item.model.js"
import Product from "../../models/product.model.js"

export const addProductToCart = async (req, res, next) => {
    try {
        const quantity = Math.max(parseInt(req.body.quantity, 10) || 1, 1)
        const product = await Product.findById(req.params.id)
        if (!product) {
            const error = new Error("Product not found")
            error.statusCode = 404
            return next(error)
        }
        if(quantity > product.stock) {
            const error = new Error("Quantity exceeds available stock")
            error.statusCode = 400
            return next(error)
        }

        const existingCartItem = await CartItem.findOne({
            user: req.user._id,
            product: product._id
        })

        let cartItem
        if (existingCartItem) {
            const updatedQuantity = existingCartItem.quantity + quantity
            if (updatedQuantity > product.stock) {
                const error = new Error("Quantity exceeds available stock")
                error.statusCode = 400
                return next(error)
            }

            existingCartItem.quantity = updatedQuantity
            cartItem = await existingCartItem.save()
        } else {
            cartItem = await CartItem.create({
                user: req.user._id,
                product: product._id,
                quantity
            })
        }

        res.status(201).json({
            success: true,
            message: "Added to cart",
            data: cartItem
        })
    } catch (error) {
        next(error)
    }
}

export const getCartItems = async (req, res, next) => {
    try {
        const cartItems = await CartItem.find({ user: req.user._id }).populate('product')
        res.status(200).json({ success: true, data: cartItems })
    } catch (error) {
        next(error)
    }
}

export const removeProductFromCart = async (req, res, next) => {
    try {
        const cartItem = await CartItem.findOneAndDelete({ user: req.user._id, product: req.params.id })
        if (!cartItem) {
            const error = new Error("Product not found in cart")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, message: "Product removed from cart" })
    } catch (error) {
        next(error)
    }
}

export const updateCartItemQuantity = async (req, res, next) => {
    try {
        const quantity = Math.max(parseInt(req.body.quantity, 10) || 1, 1)
        const itemQuantity = await CartItem.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { quantity },
            { new: true, runValidators: true }
        ).populate('product')

        if (!itemQuantity) {
            const error = new Error("Product not found in cart")
            error.statusCode = 404
            return next(error)
        }

        res.status(200).json({ success: true, data: itemQuantity })
    } catch (error) {
        next(error)
    }
}
