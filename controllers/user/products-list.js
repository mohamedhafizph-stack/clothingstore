import { productService } from '../../services/user/productService.js';
import Product from '../../model/Product.js';
import User from '../../model/User.js';
const loadProducts = async (req, res) => {
  try {
    const { category } = req.params;
    const result = await productService.getProductsByCategory(category, req.query);
    const user = req.session.user?.id || req.user._id
    const userData = await User.findById(user);
    if (!result) {
      return res.status(404).render('error/404');
    }
    console.log(result.categories)
    res.render('user/products', {
      categories: result.categories,
      products: result.products,
      currentPage: parseInt(req.query.page) || 1,
      totalPages: result.totalPages,
      category: result.categoryData,
      showSearch: true,
      selectedFilters: { 
        sizes: req.query.sizes, 
        sort: req.query.sort, 
        maxPrice: req.query.maxPrice, 
        search: req.query.search 
      },
      user:userData
    });
  } catch (error) {
    console.error("Load Shirts Error:", error);
    res.status(500).send('Server Error');
  }
};

const loadProductDetails = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.user;
    const { id } = req.params;

    const data = await productService.getProductDetails(id, userId);

    if (!data) {
      return res.status(404).render('error/404');
    }

    res.render('user/products-details', {
      product: data.product,
      relatedProducts: data.relatedProducts,
      categories: data.categories,
      user: data.user
    });
  } catch (err) {
    console.error("Load Product Details Error:", err);
    res.status(500).send('Server Error');
  }
};

export const addProductReview = async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.session.user?.id||req.user._id; 
        const user = await User.findById(userId)
        const userName=user.name
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        const newReview = {
            userId,
            userName,
            rating: Number(rating),
            comment
        };

        product.reviews.push(newReview);
 
        const totalRating = product.reviews.reduce((sum, item) => item.rating + sum, 0);
        product.averageRating = (totalRating / product.reviews.length).toFixed(1);

        await product.save();

        res.status(200).json({ 
            success: true, 
            message: "Review shared successfully!",
            averageRating: product.averageRating 
        });

    } catch (error) {
        console.error("Review Error:", error);
        res.status(500).json({ success: false, message: "Failed to post review." });
    }
};

const productController = {
  loadProducts,
  loadProductDetails,
  addProductReview
};

export default productController;