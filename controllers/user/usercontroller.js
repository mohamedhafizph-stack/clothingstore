import User from '../../model/User.js'
import optgenerator from 'otp-generator'
import {sendOtp} from '../../utils/sendOtp.js'
import bcrypt from 'bcryptjs'
import {error} from 'console'
import Address from '../../model/address.js'
import Category from '../../model/category.js'
import Product from '../../model/Product.js'


export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const loadHome = async(req,res)=>{
   
    const categories = await Category.find({status:"active"})

    const newArrivals = await Product.find({status:"Active"}).limit(4)

    const bestSellers = await Product.find({status:"Active"}).limit(4)


    res.render('user/homepage', { 
        categories: categories, 
        newArrivals: newArrivals,
        bestSellers: bestSellers 
    });
}

export const loadSignup = async(req,res)=>{
    res.render('user/Signup',{message:null})
}

export const registerUser = async(req,res)=>{

    try{
    const {name,email,password,confirmPassword}=req.body

    console.log(!name, !email, !password, !confirmPassword);
    console.log(req.body)
    if(!name||!email||!password||!confirmPassword){
        return res.render('user/Signup',{message:"All Fields are required"})
    }


     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('user/Signup', {
        message: 'Please enter a valid email address'
      });
    }

     if (password.length < 6) {
      return res.render('user/Signup', {
        message: 'Password must be at least 6 characters'
      });
    }

    if (password !== confirmPassword) {
      return res.render('user/Signup', {
        message: 'Passwords do not match'
      });
    }

     const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('user/Signup', {
        message: 'Email already registered'
      });
    }
   
    const hashedPassword = await bcrypt.hash(password, 10);

     const otp = generateOTP();

      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);




    await sendOtp(email,otp)

    req.session.otpUserId = User._id;

    req.session.otp = otp;
    req.session.tempUser = {
  name,
  email,
  password
};

req.session.save(() => {
  res.redirect('/verify-otp');
});

     
}catch (error) {
    console.log(error);
    res.render('user/Signup', { message: 'Registration failed' });
  }

}

export const loadOtpPage = (req, res) => {
  try {

    if (!req.session.otp || !req.session.tempUser) {
      return res.redirect('/signup');
    }

    res.render('user/verifyotp', {
      email: req.session.tempUser.email,
      error: null
    });
  } catch (error) {
    console.log(error);
    res.redirect('/signup');
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    let enteredOtp = req.body.otp;
    if (Array.isArray(enteredOtp)) {
       enteredOtp = enteredOtp.join('');
    }

enteredOtp = String(enteredOtp).trim();
const sessionOtp = String(req.session.otp).trim();


 console.log('Entered OTP:', enteredOtp);
    console.log('Session OTP:', sessionOtp);

   
    if (!req.session.otp || !req.session.tempUser) {
      return res.redirect('/signup');
    }

    if (Date.now() > req.session.otpExpiry) {
      req.session.destroy();
      return res.render('user/verifyotp', {
        email: '',
        error: 'OTP expired. Please signup again.'
      });
      console.log('hai');
    }

    
    if (enteredOtp !== sessionOtp) {
      return res.render('user/verifyotp', {
        email: req.session.tempUser.email,
        error: 'Invalid OTP'
      });
      console.log(otp);
      console.log(req.session.otp);
    }

   
    const hashedPassword = await bcrypt.hash(
      req.session.tempUser.password,
      10
    );


    const user = new User({
      name: req.session.tempUser.name,
      email: req.session.tempUser.email,
      password: hashedPassword,
      isVerified: true,
    });

    await user.save();

   
   delete req.session.otp;
delete req.session.otpExpiry;
delete req.session.tempUser;

    
    req.session.user = user._id;

    res.redirect('/login');

  } catch (error) {
    console.log(error);
    res.render('user/verifyotp', {
      error: 'Something went wrong',
      email: ''
    });
  }
};

export const loadLoginPage = async (req,res)=>{
 return res.render('user/login',{message:null})
}

export const VerifyLogin = async(req,res)=>{
    const {email,password} = req.body
      console.log('REQ BODY:', req.body);
    
    if(!email||!password){
       return res.render('user/login',{message:"feilds cannot be empty"})
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('user/login', {
        message: 'Please enter a valid email address'
      });
    }

    if(password.length<6){
        return res.render('user/login',{message:"Password must be minimum 6 character "})
    }
    
    const userExist = await User.findOne({email})
      console.log('USER FROM DB:', userExist);

      if (userExist.status === 'blocked') {
  return res.render('user/login', {
    message: 'Your account has been blocked by admin'
  });
}

    
    if(!userExist){
        return res.render('user/login',{message:"Invalid Email_id"})
    }   
   
        const passwordMatch = await bcrypt.compare(password, userExist.password);
    console.log('PASSWORD MATCH:', passwordMatch);

    if(!passwordMatch){
        return res.render('user/login',{message:"Password Incorrect"})
    }
   
    req.session.user={
        id:userExist._id,
        email:userExist.email
    }
        console.log('SESSION SET:', req.session.user);


    return res.redirect('/home')


}

export const loadLoggedinHomepage = async(req,res)=>{
 const categories = await Category.find({status:"active"})
     let userData;
const userId = req.user?._id || req.session.user.id;
   
    if (req.user) {
      userData = req.user;
      userData = await User.findById(userId);
    }
    
    else if (req.session.user){
   
      userData = await User.findById(userId);
    }
    
    
    else {
      return res.redirect('/login');
    }

   const categoryData = await Category.find({status:"active"})
   
   const activeCategoryNames = categoryData.map(cat => cat.name);

    const newArrivals = await Product.find({status:"Active",totalStock:{$gt:0},category:{$in:activeCategoryNames}}).limit(4)

    const bestSellers = await Product.find({status:"Active",totalStock:{$gt:0},category:{$in:activeCategoryNames}}).limit(4)
    console.log(req.session.user)
    
   return res.render('user/loggedinHomepage',{
        user:userData,
        categories: categories, 
        newArrivals: newArrivals,
        bestSellers: bestSellers 
    })
}

export const resendOtp = async (req, res) => {
  try {
    
    if (!req.session.tempUser) {
      return res.redirect('/signup');
    }

    const email = req.session.tempUser.email;

   
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

   
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 2 * 60 * 1000; 

    
    await sendOtp(email, otp);

    console.log("Resent OTP:", otp);

    
    res.render('user/verifyotp', {
      email,
      error: 'New OTP sent successfully'
    });

  } catch (error) {
    console.log(error);
    res.render('user/verifyotp', {
      error: 'Failed to resend OTP'
    });
  }
};

export const resendForgotOtp = async (req, res) => {
  if (!req.session.forgotUserId) {
    return res.redirect('/forgot-password');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  req.session.forgotOtp = otp;
  req.session.forgotOtpExpiry = Date.now() + 5 * 60 * 1000;

  await sendOtp(req.session.forgotEmail, otp);

  res.redirect('/forgot-password/otp');
};


export const loadProfile = async (req, res) => {
  const currentUser = req.user || req.session.user;
  console.log('req.user:', req.user);
console.log('req.session.user:', req.session.user);
console.log('current',currentUser);


  if (!currentUser) { 
    return res.redirect('/login');
  }
const userId = currentUser._id || currentUser.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.redirect('/login');
  }

  res.render('user/userprofile', { user }); 
};

export const loadforgetPassPage = async(req,res)=>{
    res.render('user/forgotpassword')
}

export const sendOtpforForgot = async (req, res) => {
  try {
    console.log('step1');

    const { email } = req.body;
    console.log('step2');

    const user = await User.findOne({ email });
    console.log('step3');

    
    if (!user) {
      console.log('step4 - invalid email');
      return res.render('user/forgotpassword', {
        message: "Invalid email"
      });
    }

  
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('step5 OTP:', otp);

    req.session.forgotOtp = otp;
    req.session.forgotOtpExpiry = Date.now() + 5 * 60 * 1000;
    req.session.forgotUserId = user._id; 
    console.log('step6 session set');

    await sendOtp(email, otp);
    console.log('step7 otp sent');

    return res.redirect('/forgot-otp');

  } catch (error) {
    console.error('Forgot OTP Error:', error);
    return res.render('user/forgotpassword', {
      message: "Something went wrong"
    });
  }
};

export const verifyotpForget = async(req,res)=>{
   const{otp}=req.body

let enteredOtp = req.body.otp;
    if (Array.isArray(enteredOtp)) {
       enteredOtp = enteredOtp.join('');
    }

enteredOtp = String(enteredOtp).trim();
const sessionOtp = String(req.session.forgotOtp).trim();



   if(!req.session.forgotOtp){
   
    res.redirect('/forget-password')
   }
   if (Date.now() > req.session.forgotOtpExpiry) {
    return res.render('user/verifyotp', {
      error: 'OTP expired'
    });
  }


   if (enteredOtp !== sessionOtp) {
    console.log("hello")
    return res.render('user/verifyotpPassreset', {
      error: 'Invalid OTP'
    });
  }

  res.redirect('/reset-password')

}

export const loadForgotOtp = (req, res) => {
  if (!req.session.forgotOtp) {
   
    console.log('hello')
  }
  res.render('user/verifyotpPassreset',{error:null});
};

export const loadResetPassword = (req, res) => {
  if (!req.session.forgotUserId) {
    return res.redirect('/login');
  }
  res.render('user/resetPassword',{error:null});
};

export const resetPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
   console.log(password)
   console.log(confirmPassword)
  if (password !== confirmPassword) {
    return res.render('user/resetPassword', {
      error: 'Passwords do not match'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
console.log(req.session.forgotUserId)
  await User.findByIdAndUpdate(req.session.forgotUserId, {
    password: hashedPassword
  });


  req.session.forgotOtp = null;
  req.session.forgotOtpExpiry = null;
  req.session.forgotUserId = null;

  res.redirect('/login');
}; 



export const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user?._id || req.session.user?._id || req.session.user?.id;

    if (!req.file) {
      return res.redirect('/profile');
    }

    
    const imagePath = req.file.path; 

    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: imagePath },
      { new: true }
    );

    
    if (req.session.user) {
      req.session.user = updatedUser;
    }

    res.redirect('/profile');

  } catch (error) {
    console.log(error);
    res.redirect('/profile');
  }
};

export const loadeditProfile = async(req,res)=>{
  const currentUser = req.user || req.session.user;
  
  if (!currentUser) { 
    return res.redirect('/login');
  }
const userId = currentUser._id || currentUser.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.redirect('/login');
  }
  res.render('user/editprofile',{user,error:null})
}

export const editProfile = async (req, res) => {
  try {
    console.log("req.user:", req.user);
    console.log("req.session.user:", req.session.user);

    const { name,currentpassword, password, confirmPassword } = req.body;

    const currentUser = req.user || req.session.user;
    if (!currentUser) {
      return res.redirect('/login');
    }

    const userId = currentUser._id || currentUser.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.redirect('/login');
    }

    
    if (!name || name.trim() === "") {
      return res.render('user/editprofile', {
        error: 'Name cannot be empty',
        user
      });
    }

    user.name = name;

    
    if (user.authProvider === 'local') {
     
      const passwordMatch = await bcrypt.compare(currentpassword,user.password);
        console.log(passwordMatch)
               if (!passwordMatch) {
                 return res.render('user/editprofile', {
                   error: 'Current Passwords do not match',
                   user
                 });
               }
      
      if (password || confirmPassword) {

        if (!password || !confirmPassword) {
          return res.render('user/editprofile', {
            error: 'Password fields cannot be empty',
            user
          });
        }

        

        if (password !== confirmPassword) {
          return res.render('user/editprofile', {
            error: 'Passwords do not match',
            user
          });
        }

       
        user.password = await bcrypt.hash(password, 10);
      }
    }

  
    await user.save();

    res.redirect('/profile');

  } catch (error) {
    console.error(error);
    res.render('user/editprofile', {
      error: 'Something went wrong',
      user: req.user || null
    });
  }
};

export const  loadupdateMail = async(req,res)=>{
  res.render('user/editemail')
}

export const updateEmail = async(req,res)=>{
  try{
     const {email} = req.body
     const otp = generateOTP()
     req.session.otp = otp
     req.session.email = req.body.email
     const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
     await sendOtp(email,otp)
     res.redirect('/verify-email-otp')

  }catch(error){

  }
}

export const  loadchangeEmailOtp = async(req,res)=>{
  res.render('user/verifyotpEmail',{error:null})
}

export const verifychangeEmailOtp  = async(req,res)=>{
  try{
     const{otp} = req.body

     let enteredOtp = req.body.otp;
    if (Array.isArray(enteredOtp)) {
       enteredOtp = enteredOtp.join('');
    }

    enteredOtp = String(enteredOtp).trim();
const sessionOtp = String(req.session.otp).trim();

    
      
     if(sessionOtp!==enteredOtp){
       return res.render('user/verifyotpEmail',{error:"invalid otp"})
     }
       
     const currentUser = req.session.user
     const user = currentUser.id
     const newEmail = req.session.email
     console.log(newEmail)
    

     await User.findByIdAndUpdate(user,{
      email:newEmail
     })

     res.redirect('/profile')

      
  }catch(error){
    console.log(error)
  } 
}

export const loadAdressPage = async(req,res)=>{

  const currentUser = req.user || req.session.user


  const userId = currentUser._id || currentUser.id


  const user = await User.findById(userId)


  const addresses = await Address.find({userId})


  res.render('user/myAdress',{user,addresses})
}

export const loadAddAddressPage = async(req,res)=>{
  const returnTo = req.query.returnTo || "";
  res.render('user/addAdress',{returnTo})
}

export const Addaddress = async(req,res)=>{
  try{

     const currentUser = req.user || req.session.user

     const user = currentUser._id || currentUser.id
    
     const {fullName,phone,addressLine,city,state,pincode,country,returnTo} = req.body
     console.log(req.body)
      
     const adress = new Address({
      userId:user,
      fullName:fullName,
      phone:phone,
      addressLine:addressLine,
      city:city,
      state:state,
      pincode:pincode,
      country:country
     })

     await adress.save()
     console.log(returnTo)
     if (returnTo) {
    return res.redirect(returnTo);
}

     res.redirect('/profile/adresses')

  }
  catch(error){

    console.log(error)

  }


}

export const LoadeditAdressPage = async(req,res)=>{
  
  const currentUser = req.user || req.session.user
  
  const users= currentUser._id || currentUser.id
  const user = await User.findById(users)

  const address = await Address.findById(req.params.id)

  res.render('user/edit-adress',{user,address})

}

export const updateAdress = async(req,res)=>{

  const {fullName,phone,addressLine,city,state,pincode,country} = req.body
   
  const currentUser = req.user || req.session.user
  
  const userId = currentUser._id || currentUser.id

  await Address.findByIdAndUpdate(req.params.id,{
    fullName:fullName,
    phone:phone,
    addressLine:addressLine,
    city:city,
    state:state,
    pincode:pincode,
    country:country
  })

  res.redirect('/profile/adresses')


}

export const deleteAdress = async(req,res)=>{
  try{
      
      await Address.findByIdAndDelete(req.params.id)

      res.redirect('/profile/adresses')
       
  }
  catch(error){
    console.log(error)
  }
}

export const setDefaultAdress = async(req,res)=>{
  try{
     const userId = req.user?._id || req.session.user.id

     await Address.updateMany({userId},{isDefault:false})

     await Address.findByIdAndUpdate(req.params.id,{isDefault:true})

     res.redirect('/profile/adresses')

  }
  catch(error){
    console.log(error)
  }
}

const userController = {
    verifyOtp,
    loadHome,
    loadSignup,
    registerUser,
    loadOtpPage,
    loadLoginPage,
    VerifyLogin,
    loadLoggedinHomepage,
    resendOtp,
    loadProfile,
    loadforgetPassPage,
    sendOtpforForgot,
    verifyotpForget,
    loadForgotOtp,
    loadResetPassword,
    resetPassword,
    uploadProfileImage,
    loadeditProfile,
    editProfile,
    loadupdateMail,
    updateEmail,
    loadchangeEmailOtp,
    verifychangeEmailOtp,
    loadAdressPage,
    loadAddAddressPage,
    Addaddress,
    LoadeditAdressPage,
    updateAdress,
    deleteAdress,
    setDefaultAdress,
    resendForgotOtp
};
export default userController;
