import Category from '../../models/category.model.js'

export const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find()
        res.status(200).json({ success: true, data: categories })
    } catch (error) {
        next(error)
    }
}

export const getCategory = async (req, res, next) => {
    try{
        const category = await Category.findById(req.params.id)
        if (!category) {
            const error = new Error("Category not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: category })
    } catch (error) {
        next(error)
    }
}

export const createCategory = async (req, res, next) => {
    try {
        const category = await Category.create(req.body)
        res.status(201).json({ success: true, data: category })
    } catch (error) {
        next(error)
    }
}

export const deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id)
        if (!category) {
            const error = new Error("Category not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, message: "Category deleted successfully" })
    } catch (error) {
        next(error)
    }
}

export const updateCategory = async (req, res, next) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if (!category) {
            const error = new Error("Category not found")
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({ success: true, data: category })
    } catch (error) {
        next(error)
    }
}