import mongoose from "mongoose"

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    street: {
        type: String,
        required: [true, 'Bạn chưa nhập số nhà, tên đường'],
        trim: true,
        maxlength: [100, 'Địa chỉ cụ thể không được vượt quá 100 ký tự']
    },
    ward: { 
        type: String,
        required: [true, 'Bạn chưa chọn Phường/Xã'],
    },
    district: { 
        type: String,
        required: [true, 'Bạn chưa chọn Quận/Huyện'],
    },
    city: { 
        type: String,
        required: [true, 'Bạn chưa chọn Tỉnh/Thành phố'],
    },
    
}, { timestamps: true, versionKey: false })

const Address = mongoose.model('Address', addressSchema)
export default Address