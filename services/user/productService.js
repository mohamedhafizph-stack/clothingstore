import Product from '../../model/Product.js';
import Category from '../../model/category.js';
import User from '../../model/User.js';
import mongoose from 'mongoose';

export const productService = {
 
  async getProductsByCategory(categoryName, filters) {
    let { sizes, sort, maxPrice, search, page = 1 } = filters;
    const limit = 8; 
    const skip = (parseInt(page) - 1) * limit;

    const categoryData = await Category.findOne({
      status: "active",
      name: categoryName
    });

    if (!categoryData) return null;

    let query = {
      category: categoryData._id,
      totalStock: { $gt: 0 },
      status: "Active"
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (maxPrice) {
      query.salePrice = { $lte: Number(maxPrice) };
    }

    if (sizes) {
      const sizesArray = sizes.split(',');
      query.variants = {
        $elemMatch: {
          stock: { $gt: 0 },
          size: { $in: sizesArray }
        }
      };
    }

    let sortQuery = {};
    switch (sort) {
      case 'priceLow': sortQuery.salePrice = 1; break;
      case 'priceHigh': sortQuery.salePrice = -1; break;
      case 'new': sortQuery.createdAt = -1; break;
      default: sortQuery.createdAt = -1;
    }

    const [products, totalProducts, allCategories] = await Promise.all([
      Product.find(query).populate('category').sort(sortQuery).skip(skip).limit(limit),
      Product.countDocuments(query),
      Category.find({ status: "active" })
    ]);

    return {
      products,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      categories: allCategories,
      categoryData
    };
  },

  async getProductDetails(productId, userId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) return null;

    const product = await Product.findById(productId).populate('category');
    if (!product) return null;

    const [categories, relatedProducts, user] = await Promise.all([
      Category.find({ status: "active" }),
      Product.find({
        status: "Active",
        category: product.category._id || product.category, 
        _id: { $ne: product._id }
      }).limit(3),
      userId ? User.findById(userId) : null
    ]);

    return { product, categories, relatedProducts, user };
  },

  async createNewProduct(productData, files) {
    const { name, category, price, discount, description } = productData;
    
    if (!name || !category || !price) {
        throw new Error("Product Name, Category, and Price are required.");
    }

    const imageUrls = files ? files.map(file => file.path) : [];

    const product = new Product({
        name,
        category, 
        price: Number(price),
        discount: Number(discount) || 0,
        description,
        images: imageUrls,
        variants: [], 
    });

    return await product.save();
  }
};