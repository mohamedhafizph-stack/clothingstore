import express from 'express'
const router = express.Router();
import authController from '../controllers/admin/admincontroller.js'
import adminAuth from '../middlewares/adminAuth.js'
import user from '../controllers/admin/customer.js'
import { isLoggedIn } from '../middlewares/isloggedinAdmin.js';
import categoryController from '../controllers/admin/categoryController.js';
import productController from '../controllers/admin/productController.js';
//import { uploadProductImages } from '../config/productMulter.js';
import upload from "../config/productMulter.js";
import orderController from '../controllers/admin/order-managment.js';
import returnController from '../controllers/admin/return-controller.js';

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

router.get('/categories',adminAuth,categoryController.loadCategory)
router.get('/categories/add',adminAuth,categoryController.loadaddCategory)
router.post('/categories/add',adminAuth,categoryController.addCategory)
router.get('/categories/edit/:id',adminAuth,categoryController.loadeditCategory)
router.patch('/categories/edit/:id',adminAuth,categoryController.editCategory)
router.patch('/categories/block/:id',adminAuth,categoryController.blockCategory)
router.patch('/categories/unblock/:id',adminAuth,categoryController.unblockCategory)
router.get('/products',adminAuth,productController.loadProduct)
router.get('/products/add',adminAuth,productController.loadaddProduct)
router.post('/products/add',adminAuth,upload.array("images",5),productController.addProduct)
router.get('/products/manage-stock/:id',adminAuth,productController.getManageStock);
router.post('/products/manage-stock/:id',adminAuth,productController.updateStock);
router.get('/products/edit/:id',adminAuth,upload.array("images",5),productController.loadeditProduct)
router.patch('/products/edit/:id',adminAuth,upload.array("images",5),productController.editProduct)
router.patch('/products/status/:id',adminAuth,productController.productStatus)
router.patch('/products/stock/:productId/:variantId',adminAuth,productController.removeStock)
router.get('/orders', adminAuth, orderController.getAdminOrders);
router.patch('/orders/update-status', adminAuth, orderController.updateOrderStatus);
router.patch('/orders/update-item-status', adminAuth, orderController.updateItemStatus)
router.patch('/orders/handle-return', adminAuth, orderController.handleReturnStatus);
router.get('/returns', adminAuth, returnController.getReturnRequests);
router.patch('/returns/handle', adminAuth, returnController.handleReturnAction);
router.patch('/returns/approve-order', adminAuth, returnController.approveFullOrderReturn);
router.get('/orders/:id', adminAuth,orderController.getorderDetails);
router.get('/logout',(req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/admin/login',{error:null})
    })
})
 
export default router 