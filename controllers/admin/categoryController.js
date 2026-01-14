import Category from "../../model/category.js"

const loadCategory = async(req,res)=>{
    try{
        const {status,search} = req.query
        let filter={}
        if(search){
            filter.name = {$regex:search,$options:"i"}
        }
        if(status&&status!== "all"){
            filter.status=status
        }
        const categories = await Category.find(filter).sort({createdAt:-1}).lean()
        res.render('admin/category-managment',{categories,selectedStatus:status||"all",search})
    
    }
    catch(err){
       console.log(err)
    }
}

const loadaddCategory = async (req,res)=>{
    try{
        
         res.render('admin/add-category',{message:""})
    }
    catch(err){
        console.log(err)
    }
}

const addCategory = async (req,res)=>{
    try{
        const {name} = req.body
        const totalCategory = await Category.countDocuments({status:"active"})
        const limit = 4
        console.log(totalCategory)
        if(totalCategory>=limit){
         return res.render('admin/add-category',{message:"max limit"})
        }

        if(!name||name.trim()==""){
           return res.render('admin/add-category',{message:"enter a valid name"})
        }
        
        const exist = await Category.findOne({name:name.trim()})

        if(exist){
            res.render('admin/add-category',{message:"Category already exist"})
        }
    
        await Category.create({
            name:name.trim()
        })
      return  res.redirect('/admin/categories')
    }
    catch(err){
        console.log(err)
    }
}

const loadeditCategory = async (req,res)=>{
    try{
       const {id} = req.params
      const   category = await Category.findById(id)
       res.render('admin/edit-category',{category})
    }
    catch(err){
        console.log(err)
    }
}

const editCategory = async (req,res)=>{
   try{
    const {name} = req.body
    const {id} = req.params
    const category = await Category.findById(id)
    if(category.name==name){
        return res.render('admin/edit-category',{message:"Category already exist"})
    }
    await Category.findByIdAndUpdate(id,{
        name:name.trim()
    })
    res.redirect('/admin/categories')
   }
   catch(error){
    console.log(error)
   }
}

const blockCategory = async (req,res)=>{
    try{
        const {id} = req.params
        await Category.findByIdAndUpdate(id,{ status:"blocked"})
        res.redirect('/admin/categories')
    }catch(err){
        console.log(err)
    }
}

const unblockCategory = async (req,res)=>{
    try{
        const {id} = req.params
        await Category.findByIdAndUpdate(id,{status:"active"})
        res.redirect('/admin/categories')
    }catch(err){

    }
}
const categoryController = {
    loadCategory,loadaddCategory,addCategory,
    loadeditCategory, editCategory, blockCategory,
    unblockCategory
}
export default categoryController