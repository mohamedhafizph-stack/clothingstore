const express = require('express');
const router = express.Router(); 
const userController = require('../../controllers/user/usercontroller')
const userAuth = require('../../middlewares/userAuth');
const isLoggedIn = require('../../middlewares/isLoggedin')
const upload = require('../../config/multer');




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
router.post('/profile/upload-image',userAuth,upload.single('profilePic'),userController.uploadProfileImage);
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

router.get('/test', (req, res) => { 
  res.send('User routes working'); 
});   
  

  


module.exports = router 