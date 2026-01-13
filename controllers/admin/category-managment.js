
import Admin from '../../model/Admin.js'

import User from '../../model/User.js' 
import category from '../../model/category.js'

export const loadCategory = async(req,res)=>{
    try{
        const categories = await category.find().sort({createdAt:-1}).lean();
        res.render('admin/categorymanagment',{categories,error:null})
    }
    catch(err){
        console.log(err)
    }
}