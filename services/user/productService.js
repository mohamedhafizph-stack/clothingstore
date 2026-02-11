import Product from '../../model/Product.js';
import Category from '../../model/category.js';
import User from '../../model/User.js';

export const productService = {
  /**
   * Fetches products based on category, filters, and pagination
   */
  async getProductsByCategory(categoryName, filters) {
    let { sizes, sort, maxPrice, search, page = 1 } = filters;
    const limit = 2;
    const skip = (parseInt(page) - 1) * limit;

    // 1. Verify Category exists and is active
    const categoryData = await Category.findOne({
        status: "active",
      name: categoryName
    });

    if (!categoryData) return null;

    // 2. Build Query
    let query = {
      category: categoryData.name,
      totalStock: { $gt: 0 },
      status: "Active"
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (maxPrice) {
      query.price = { $lte: Number(maxPrice) };
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

    // 3. Build Sort
    let sortQuery = {};
    switch (sort) {
      case 'priceLow': sortQuery.price = 1; break;
      case 'priceHigh': sortQuery.price = -1; break;
      case 'new': sortQuery.createdAt = -1; break;
      default: sortQuery.popularity = -1;
    }

    // 4. Execute Queries
    const [products, totalProducts, allCategories] = await Promise.all([
      Product.find(query).populate('category').sort(sortQuery).skip(skip).limit(limit),
      Product.countDocuments(query),
      Category.find({status:"active"})
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
    const product = await Product.findById(productId);
    if (!product) return null;

    const [categories, relatedProducts, user] = await Promise.all([
      Category.find(),
      Product.find({
        status: "Active",
        category: product.category,
        _id: { $ne: product._id }
      }).limit(3),
      userId ? User.findById(userId) : null
    ]);

    return { product, categories, relatedProducts, user };
  }
};