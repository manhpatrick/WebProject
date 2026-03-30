import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../../models/user.model.js'

// Đăng ký
export const signUp = async (req, res, next) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const { email, password, confirmPassword } = req.body;

        if (!email || !password || !confirmPassword) {
            const error = new Error('Vui lòng cung cấp đầy đủ thông tin');
            error.statusCode = 400;
            throw error;
        }

        if (password !== confirmPassword) {
            const error = new Error('Mật khẩu xác nhận không khớp');
            error.statusCode = 400;
            throw error;
        }

        const existingUser = await User.findOne({ email }).session(session);

        if (existingUser) {
            const error = new Error('Email đã tồn tại');
            error.statusCode = 409;
            throw error;
        }

        const userValidation = new User({ email, password });
        await userValidation.validate();

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ email, password: hashPassword });
        await newUser.save({ session, validateBeforeSave: false });

        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: {
                user: {
                    _id: newUser._id,
                    email: newUser.email,
                    role: newUser.role,
                    createdAt: newUser.createdAt,
                    updatedAt: newUser.updatedAt
                },
                token
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// Đăng nhập
export const signIn = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            const error = new Error('Email không tồn tại');
            error.statusCode = 404;
            throw error;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            const error = new Error('Mật khẩu không đúng');
            error.statusCode = 401;
            throw error;
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

// Đăng xuất
export const signOut = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        next(error);
    }
}

// Đổi mật khẩu
export const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, confirmNewPassword } = req.body

        if (!oldPassword || !newPassword || !confirmNewPassword) {
            const error = new Error('Vui lòng cung cấp đầy đủ thông tin')
            error.statusCode = 400
            throw error
        }

        if (newPassword !== confirmNewPassword) {
            const error = new Error('Mật khẩu xác nhận không khớp')
            error.statusCode = 400
            throw error
        }

        if (oldPassword === newPassword) {
            const error = new Error('Mật khẩu mới phải khác mật khẩu cũ')
            error.statusCode = 400
            throw error
        }

        const user = await User.findById(req.user._id)
        if (!user) {
            const error = new Error('Người dùng không tồn tại')
            error.statusCode = 404
            throw error
        }

        const isValidOldPassword = await bcrypt.compare(oldPassword, user.password)
        if (!isValidOldPassword) {
            const error = new Error('Mật khẩu cũ không đúng')
            error.statusCode = 401
            throw error
        }

        const salt = await bcrypt.genSalt(10)
        const hashedNewPassword = await bcrypt.hash(newPassword, salt)

        user.password = hashedNewPassword
        await user.save()

        res.status(200).json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        })
    } catch (error) {
        next(error)
    }
}

// Quên mật khẩu
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body

        if (!email) {
            const error = new Error('Vui lòng cung cấp email')
            error.statusCode = 400
            throw error
        }

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email không tồn tại'
            })
        }

        const resetToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        )

        user.resetPasswordToken = resetToken
        user.resetPasswordExpiry = new Date(Date.now() + 30 * 60 * 1000)
        await user.save()

        res.status(200).json({
            success: true,
            message: 'Token reset mật khẩu đã được gửi',
            data: {
                resetToken,
                expiresIn: '30 phút'
            }
        })
    } catch (error) {
        next(error)
    }
}

// Reset mật khẩu
export const resetPassword = async (req, res, next) => {
    try {
        const { resetToken, newPassword, confirmNewPassword } = req.body

        if (!resetToken || !newPassword || !confirmNewPassword) {
            const error = new Error('Vui lòng cung cấp đầy đủ thông tin')
            error.statusCode = 400
            throw error
        }

        if (newPassword !== confirmNewPassword) {
            const error = new Error('Mật khẩu xác nhận không khớp')
            error.statusCode = 400
            throw error
        }

        let decoded
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET)
        } catch (err) {
            const error = new Error('Token không hợp lệ hoặc đã hết hạn')
            error.statusCode = 401
            throw error
        }

        const user = await User.findById(decoded.userId)
        if (!user) {
            const error = new Error('Người dùng không tồn tại')
            error.statusCode = 404
            throw error
        }

        if (user.resetPasswordToken !== resetToken) {
            const error = new Error('Token không khớp')
            error.statusCode = 401
            throw error
        }

        if (new Date() > user.resetPasswordExpiry) {
            user.resetPasswordToken = null
            user.resetPasswordExpiry = null
            await user.save()
            const error = new Error('Token đã hết hạn')
            error.statusCode = 401
            throw error
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        user.password = hashedPassword
        user.resetPasswordToken = null
        user.resetPasswordExpiry = null
        await user.save()

        res.status(200).json({
            success: true,
            message: 'Reset mật khẩu thành công'
        })
    } catch (error) {
        next(error)
    }
}