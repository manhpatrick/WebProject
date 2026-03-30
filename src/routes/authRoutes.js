import express from 'express'
import { signUp, signIn, signOut, changePassword, forgotPassword, resetPassword } from '../controller/auth.controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()
router.post('/sign-up', signUp)
router.post('/sign-in', signIn)
router.post('/sign-out', signOut)
router.post('/change-password', authMiddleware, changePassword)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/profile', (req,res) =>{

})
router.post('/help', (req,res) =>{

})

router.post('/purchase', (req,res) => {
    
})
export default router