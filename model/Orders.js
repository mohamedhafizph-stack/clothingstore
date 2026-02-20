    import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { 
        type: String, 
        default: () => Math.floor(100000 + Math.random() * 900000).toString(),
        unique: true 
    },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, 
        size: { type: String, required: true },
        status: {
            type: String,
            enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Returned'],
            default: 'Pending'
        },
        returnReason: { type: String }
    }],
    shippingAddress: {
        fullName: String,
        addressLine: String,
        city: String,
        state: String,
        pincode: String,
        phone: String
    },

    subtotal: { 
        type: Number, 
        required: true, 
        default: 0 
    }, 
    
    couponCode: { 
        type: String, 
        default: null 
    },
    
    couponDiscount: { 
        type: Number, 
        default: 0 
    },

    totalPrice: { 
        type: Number, 
        required: true 
    }, 
    status: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Returned'] 
    },
    paymentMethod: { type: String, default: 'COD' }, 
    paymentStatus: { 
        type: String, 
        default: 'Pending',
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'] 
    }
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);
export default Order; 