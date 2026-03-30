import User from '../../models/user.model.js'
import bcrypt from 'bcryptjs'

export const getUsers = async (req, res, next) => {
    try{
        const users = await User.find().select('-password')
        res.status(200).json({ success: true, data: users })
    } catch (error) {
        next(error)
    }
}

export const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password')
        if (!user) {
            const error = new Error("User not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: user })
    } catch (error) {
        next(error)
    }
}

export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id)
        if (!user) {
            const error = new Error("User not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, message: "User deleted successfully" })
    } catch (error) {
        next(error)
    }
}

export const updateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password')
        if (!user) {
            const error = new Error("User not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: user })
    } catch (error) {
        next(error)
    }
}

export const createUser = async (req, res, next) => {
    try {
        const { password, ...rest } = req.body
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new User({ ...rest, password: hashedPassword })
        await newUser.save()
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt
            }
        })
    } catch (error) {
        next(error)
    }
}
