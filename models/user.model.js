import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        trim: true,
        minlength: [2, 'Username phải có ít nhất 2 ký tự'],
        maxlength: [50, 'Username không được vượt quá 50 ký tự']
    },
    email: {
        type: String,
        required: [true, 'Bạn chưa nhập Email'],
        unique: true,
        trim: true,
        match: [/.+@.+\..+/, 'Email không hợp lệ']
    },
    phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Số điện thoại không được vượt quá 20 ký tự']
    },
    password: {
        type: String,
        required: [true, 'Bạn chưa nhập mật khẩu'],
        minlength: [8, 'Mật khẩu phải có ít nhất 8 ký tự, có số và ký tự đặc biệt'],
        maxlength: [100, 'Mật khẩu không được vượt quá 100 ký tự'],
        match: [
            /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/,
            'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt'
        ]
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    gender: {
        enum: ['Nam', 'Nữ'],
        type: String,
    },
    birthdate: {
        type: Date
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpiry: {
        type: Date,
        default: null
    }
}, { timestamps: true, versionKey: false })

const User = mongoose.model('User', userSchema)
export default User