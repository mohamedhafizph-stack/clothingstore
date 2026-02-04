import { productService } from '../../services/user/productService.js';

const loadShirts = async (req, res) => {
  try {
    const { category } = req.params;
    const result = await productService.getProductsByCategory(category, req.query);

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
      selectedFilters: { 
        sizes: req.query.sizes, 
        sort: req.query.sort, 
        maxPrice: req.query.maxPrice, 
        search: req.query.search 
      }
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

const productController = {
  loadShirts,
  loadProductDetails
};

export default productController;