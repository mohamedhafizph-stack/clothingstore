import User from '../../model/User.js'
import optgenerator from 'otp-generator'
import {sendOtp} from '../../utils/sendOtp.js'
import bcrypt from 'bcryptjs'
import {error} from 'console'
import Address from '../../model/address.js'
import Category from '../../model/category.js'
import Product from '../../model/Product.js'



const loadShirts = async (req, res) => {
  try {
    const { category } = req.params; 
    let { sizes, sort, maxPrice, search, page = 1 } = req.query;
    console.log(category)
    page = parseInt(page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const categoryData = await Category.findOne({
   name:category,
   status:"active"
});
console.log(categoryData)

    if (!categoryData) {
      return res.status(404).render('error/404');
    }

    
    let query = {
      "category":categoryData.name,
      totalStock:{$gt:0},
      status:"Active"
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (maxPrice) {
      query.price = { $lte: Number(maxPrice) };
    }

if (req.query.sizes) {
    const sizesArray = req.query.sizes.split(','); 
    query.variants = {
        $elemMatch: { 
            stock: { $gt: 0 },
            size: { $in: sizesArray } 
        }
    };
}
    
    let sortQuery = {};
    switch (sort) {
      case 'priceLow':
        sortQuery.price = 1;
        break;
      case 'priceHigh':
        sortQuery.price = -1;
        break;
      case 'new':
        sortQuery.createdAt = -1;
        break;
      default:
        sortQuery.popularity = -1;
    }

    
    const products = await Product.find(query).populate('category').sort(sortQuery).skip(skip).limit(limit);

      console.log(products)

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('user/products', {
      products,
      currentPage: page,
      totalPages,
      category: categoryData,
      selectedFilters: { sizes, sort, maxPrice, search }
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

const loadProductDetails = async (req,res) => {
    try{
        const {id}= req.params
        const product = await Product.findById(id)
        const cat = product.category
        const relatedProducts = await Product.find({status:"Active",category:cat}).limit(3)
     res.render('user/products-details',{product,relatedProducts})
    }catch(err){
        console.log(err)
    }
}  

const productController = {
    loadShirts,loadProductDetails
}
export default productController