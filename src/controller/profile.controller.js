import User from "../../models/user.model.js"
import Address from "../../models/address.model.js"

const isValidVietnamesePhone = (value) => /^(?:\+84|84|0)(3|5|7|8|9)\d{8}$/.test(value)

const formatProfileResponse = (profile) => ({
    _id: profile._id,
    email: profile.email,
    username: profile.username,
    phone: profile.phone,
    birthdate: profile.birthdate
        ? profile.birthdate.toLocaleDateString('en-CA')
        : null,
    gender: profile.gender,
    role: profile.role,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
})

export const getProfile = async (req, res, next) => {
    try {
        const profile = await User.findById(req.user._id).select('-password')
        if (!profile) {
            const error = new Error("Profile not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: formatProfileResponse(profile) })
    } catch (error) {
        next(error)
    }
}

export const updateProfile = async (req, res, next) => {
    try {
        const { username, phone, gender, birthdate } = req.body
        const updateData = {}
        if (username !== undefined) updateData.username = username
        if (phone !== undefined) {
            const normalizedPhone = String(phone || '').trim().replace(/[\s.-]/g, '')
            if (!normalizedPhone) {
                const error = new Error('Vui lòng nhập số điện thoại')
                error.statusCode = 400
                throw error
            }

            const isValidPhone = /^(?:\+84|84|0)(3|5|7|8|9)\d{8}$/.test(normalizedPhone)
            if (!isValidPhone) {
                const error = new Error('Số điện thoại không hợp lệ (ví dụ: 0912345678 hoặc +84912345678)')
                error.statusCode = 400
                throw error
            }

            updateData.phone = normalizedPhone
        }
        if (gender !== undefined) updateData.gender = gender
        if (birthdate !== undefined) {
            const parsedBirthdate = new Date(birthdate)
            if (isNaN(parsedBirthdate.getTime())) {
                const error = new Error('Ngày sinh không hợp lệ. Dùng định dạng dd/mm/yyyy')
                error.statusCode = 400
                throw error
            }
            updateData.birthdate = parsedBirthdate
        }

        const profile = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).select('-password')
        if (!profile) {
            const error = new Error("Profile not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: formatProfileResponse(profile) })
    } catch (error) {
        next(error)
    }
}

export const getAddresses = async (req, res, next) => {
    try {
        const addresses = await Address.find({ user: req.user._id })

        if (addresses.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No addresses yet",
                data: []
            })
        }

        res.status(200).json({
            success: true,
            data: addresses
        })
    } catch (error) {
        next(error)
    }
}

export const getAddress = async (req, res, next) => {
    try {
        const address = await Address.findOne({ _id: req.params.id, user: req.user._id })
        if (!address) {
            const error = new Error("Address not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: address })
    } catch (error) {
        next(error)
    }
}
        
export const createAddress = async (req, res, next) => {
    try {
        const { street, ward, district, city, note } = req.body

        const createData = {
            user: req.user._id,
            street,
            ward,
            district,
            city,
            note,
        }

        const address = await Address.create(createData)
        res.status(201).json({ success: true, data: address })
    } catch (error) {
        next(error)
    }
}


export const updateAddress = async (req, res, next) => {
    try {
        const { street, ward, district, city, note } = req.body

        const updateData = {}
        if (street !== undefined) updateData.street = street
        if (ward !== undefined) updateData.ward = ward
        if (district !== undefined) updateData.district = district
        if (city !== undefined) updateData.city = city
        if (note !== undefined) updateData.note = note

        const address = await Address.findOneAndUpdate({ _id: req.params.id, user: req.user._id },
            updateData,
            { new: true, runValidators: true }
        )
        if (!address) {
            const error = new Error("Address not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: address })
    } catch (error) {
        next(error)
    }
}

export const deleteAddress = async (req, res, next) => {
    try {
        const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id })
        if (!address) {
            const error = new Error("Address not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, message: "Address deleted successfully" })
    } catch (error) {
        next(error)
    }
}
