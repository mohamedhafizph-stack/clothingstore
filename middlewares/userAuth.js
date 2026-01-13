
import User from '../model/User.js'

   
export const userAuth = async (req,res,next)=>{

    try{
          if(!req.isAuthenticated?.() && !req.session.user){
           return res.redirect('/login')
          }
       

         const userId = req.user?.id || req.session?.user?.id
         const user = await User.findById(userId)
         console.log(user)
         if(!user || user.status!=="active"){
         return req.session.destroy(()=>{
          return  res.redirect('/login')
          })
         }
        return next()
    }
    catch(error){
console.log(error)
    }

}


