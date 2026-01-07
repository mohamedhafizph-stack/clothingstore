const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/admincontroller');
const adminAuth = require('../middlewares/adminAuth')
const userController = require('../controllers/user/usercontroller')
const user = require('../controllers/admin/customer')
const isLoggedIn = require('../middlewares/isloggedinAdmin')


router.get('/login',isLoggedIn,authController.loadLoginPage);
router.post('/login',isLoggedIn,authController.logingIn);


router.get('/dashboard', (req, res) => {
    const data = {
        stats: { sales: '12,500', orders: 350, revenue: '25,000', avgValue: '71.43' },
        activity: [
            { id: '#12345', customer: 'Ethan Harper', amount: 150, status: 'Shipped' },
            { id: '#12346', customer: 'Olivia Bennett', amount: 200, status: 'Processing' },
           
        ]
    };
    res.render('admin/dashboard', data);
});

  
router.get('/users',adminAuth,authController.loadUserList)

router.get('/users/status/:id',adminAuth,authController.toggleUserStatus)

router.post('/users/block/:id',adminAuth,user.blockUser);
router.post('/users/unblock/:id',adminAuth,user.unblockUser);

  
 
router.get('/logout',(req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/admin/login',{error:null})
    })
})
 
module.exports = router;
