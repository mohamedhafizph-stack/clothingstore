import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
        type: String, // You can also use mongoose.Schema.Types.ObjectId if linking to Category model
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    trim: true
  },
  images: {
    type: [String], // Array of filenames from Multer
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  // This is where your Manage Stock data lives
  variants: [variantSchema], 
  
  // Virtual-like field to show total across all sizes
  totalStock: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Middleware: Automatically calculate totalStock before saving
productSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((acc, curr) => acc + curr.stock, 0);
  } else {
    this.totalStock = 0;
  }
  
});

const Product = mongoose.model('Product', productSchema);
export default Product;