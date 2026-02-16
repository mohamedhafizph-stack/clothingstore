import * as walletService from '../../services/user/walletService.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../../model/User.js';

export const loadWalletPage = async (req, res) => {
    try {
        const userId = req.session?.user.id || req.user.id;
        const walletData = await walletService.getWalletData(userId);
        
        res.render('user/wallet', { 
            user: walletData,
            message: null ,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error(error);
        res.redirect('/profile');
    }
};

export const addMoney = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session?.user.id || req.user._id;

        if (!amount || amount <= 0) {
            return res.json({ success: false, message: "Invalid amount" });
        }

        await walletService.addMoneyToWallet(userId, parseFloat(amount));
        res.json({ success: true, message: `₹${amount} added successfully!` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createWalletOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: amount * 100, 
            currency: "INR",
            receipt: `wallet_rcpt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Order creation failed" });
    }
};

export const verifyWalletPayment = async (req, res) => {
    try {
        const { response, amount } = req.body;
        const userId = req.user ? req.user._id : req.session.user;

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(response.razorpay_order_id + "|" + response.razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === response.razorpay_signature) {
            await User.findByIdAndUpdate(userId, { 
                $inc: { wallet: parseFloat(amount) } 
            });

            res.json({ success: true, message: "Wallet updated successfully!" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Payment verification failed" });
    }
};
const walletController= {addMoney,loadWalletPage,createWalletOrder,verifyWalletPayment}
export default walletController