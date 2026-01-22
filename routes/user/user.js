import express from 'express'
const router = express.Router(); 
import userController from '../../controllers/user/usercontroller.js'
import {userAuth}  from '../../middlewares/userAuth.js'
import { isLoggedIn } from '../../middlewares/isLoggedin.js';
import {uploadProfilePic} from '../../config/multer.js'
import productController from '../../controllers/user/products-list.js';
import cartController from '../../controllers/user/cart-conroller.js';
import checkoutController from '../../controllers/user/checkout-controller.js';
import orderController from '../../controllers/user/order-controller.js';



router.get('/landing',isLoggedIn,userController.loadHome)

router.get('/signup',isLoggedIn,userController.loadSignup)
router.post('/signup',userController.registerUser)

router.get('/verify-otp',userController.loadOtpPage) 
router.post('/verify-otp',userController.verifyOtp)
router.get('/resend-otp',userController.resendOtp)

router.get('/login',isLoggedIn,userController.loadLoginPage)
router.post('/login',userController.VerifyLogin)

router.get('/forgot-password',userController.loadforgetPassPage)
router.post('/forgot-password',userController.sendOtpforForgot)
router.get('/resend-otp-forgot',userController.resendForgotOtp)

router.get('/forgot-otp', userController.loadForgotOtp);
router.post('/forgot-otp', userController.verifyotpForget);
 
router.get('/reset-password', userController.loadResetPassword);
router.post('/reset-password', userController.resetPassword);

router.get('/home',userAuth,userController.loadLoggedinHomepage) 
 
router.get('/profile',userAuth,userController.loadProfile)  
router.post('/profile/upload-image',userAuth,uploadProfilePic,userController.uploadProfileImage);
router.get('/profile/edit-profile',userAuth,userController.loadeditProfile)
//router.post('/profile/edit-profile',userAuth,userController.editProfile)
router.put('/profile',userAuth,userController.editProfile)
router.get('/profile/edit-profile/change-email',userAuth,userController.loadupdateMail)
router.post('/profile/edit-profile/change-email',userAuth,userController.updateEmail)
router.get('/verify-email-otp',userAuth,userController.loadchangeEmailOtp)
router.post('/verify-email-otp',userAuth,userController.verifychangeEmailOtp)

router.get('/profile/adresses',userAuth,userController.loadAdressPage)
router.get('/profile/adresses/add',userAuth,userController.loadAddAddressPage)
router.post('/profile/adresses/add',userAuth,userController.Addaddress)
router.get('/profile/adresses/edit/:id',userAuth,userController.LoadeditAdressPage)
router.put('/profile/adresses/:id',userAuth,userController.updateAdress)
router.delete('/profile/adresses/:id',userAuth,userController.deleteAdress)
router.post('/profile/adresses/set-default/:id',userAuth,userController.setDefaultAdress)
router.get('/shop/:category',userAuth,productController.loadShirts)
router.get('/shop/details/:id',userAuth,productController.loadProductDetails)
router.post('/shop/details/:product_id',userAuth,cartController.addtoCart)
router.get('/home/cart',userAuth,cartController.loadCart)
router.patch('/home/cart/update',userAuth,cartController.updateCartQuantity)
router.get('/cart/checkout',userAuth,checkoutController.loadCheckoutpage)
router.get('/cart/checkout/add',userAuth,userController.loadAddAddressPage)
router.post('/cart/checkout/add',userAuth,userController.Addaddress)
router.post('/order/place', userAuth, orderController.placeOrder);
router.get('/cart/checkout/success/:orderId', userAuth, orderController.loadOrderSuccess);
router.get('/order/download-invoice/:orderId', userAuth, orderController.downloadInvoice);
router.get('/user/orders/:id', userAuth, orderController.getOrderDetails);
router.get('/user/orders', userAuth, orderController.getMyOrders);
router.patch('/user/orders/cancel/:orderId', userAuth, orderController.cancelOrder);
router.get('/user/orders/return/:id', userAuth, orderController.getReturnPage);
router.post('/user/orders/return/submit', userAuth, orderController.submitReturnRequest);
  

  

export default router
