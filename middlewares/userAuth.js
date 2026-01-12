const User = require("../model/User")

   
const userAuth = async (req,res,next)=>{

    try{
          if(!req.isAuthenticated?.() && !req.session.user){
           return res.redirect('/login')
          }
          console.log('SESSION USER:', req.session.user);
console.log('PASSPORT USER:', req.user);

         const userId = req.user?.id || req.session?.user?.id
         const user = await User.findById(userId)
         if(user.status!=="active"){
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

module.exports = userAuth