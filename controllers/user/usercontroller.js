const User = require('../../model/User');
const optgenerator = require('otp-generator')
const {sendOtp} = require('../../utils/sendOtp');
const bcrypt = require('bcryptjs');
const { error } = require('console');
const Address = require('../../model/address');



const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};



const loadHome = async(req,res)=>{
    // 1. Define your data (Usually fetched from a database)
    const categories = [
        { name: 'Shirts', image: '/images/Gemini_Generated_Image_akh47dakh47dakh4.png', bgColor: '#1c2e2a' },
        { name: 'T-Shirts', image: '/images/Gemini_Generated_Image_x08oidx08oidx08o.png', bgColor: '#1c2e2a' },
        { name: 'Pants', image: '/images/Gemini_Generated_Image_mwmaq9mwmaq9mwma.png', bgColor: '#1c2e2a' },
        { name: 'Shorts', image: '/images/Gemini_Generated_Image_bofzy3bofzy3bofz.png', bgColor: '#1c2e2a' }
    ];

    const newArrivals = [ { name: 'Shirts', image: '/images/Gemini_Generated_Image_1f58yn1f58yn1f58.png', bgColor: '#1c2e2a' },
        { name: 'T-Shirts', image: '/images/Gemini_Generated_Image_x08oidx08oidx08o.png', bgColor: '#2a423d' },
        { name: 'Pants', image: '/images/Gemini_Generated_Image_mwmaq9mwmaq9mwma.png', bgColor: '#314b5c' },
        { name: 'Shorts', image: '/images/Gemini_Generated_Image_bofzy3bofzy3bofz.png', bgColor: '#ffffff' }]; // Define this too so you don't get another error!
    const bestSellers = [ { name: 'Shirts', image: '/images/Gemini_Generated_Image_1f58yn1f58yn1f58.png', bgColor: '#1c2e2a' },
        { name: 'T-Shirts', image: '/images/Gemini_Generated_Image_x08oidx08oidx08o.png', bgColor: '#2a423d' },
        { name: 'Pants', image: '/images/Gemini_Generated_Image_mwmaq9mwmaq9mwma.png', bgColor: '#314b5c' },
        { name: 'Shorts', image: '/images/Gemini_Generated_Image_bofzy3bofzy3bofz.png', bgColor: '#ffffff' }];

     // 2. Pass the data to the render function
    res.render('user/homepage', { 
        categories: categories, 
        newArrivals: newArrivals,
        bestSellers: bestSellers 
    });
}



const loadSignup = async(req,res)=>{
    res.render('user/Signup',{message:null})
}



const registerUser = async(req,res)=>{

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



const loadOtpPage = (req, res) => {
  try {
    // If no OTP session, block direct access
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



const verifyOtp = async (req, res) => {
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

    // 1️⃣ Session validation
    if (!req.session.otp || !req.session.tempUser) {
      return res.redirect('/signup');
    }

    // 2️⃣ OTP expiry check
    if (Date.now() > req.session.otpExpiry) {
      req.session.destroy();
      return res.render('user/verifyotp', {
        email: '',
        error: 'OTP expired. Please signup again.'
      });
      console.log('hai');
    }

    // 3️⃣ OTP match
    if (enteredOtp !== sessionOtp) {
      return res.render('user/verifyotp', {
        email: req.session.tempUser.email,
        error: 'Invalid OTP'
      });
      console.log(otp);
      console.log(req.session.otp);
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(
      req.session.tempUser.password,
      10
    );

    // 5️⃣ Create user ONLY AFTER OTP VERIFIED
    const user = new User({
      name: req.session.tempUser.name,
      email: req.session.tempUser.email,
      password: hashedPassword,
      isVerified: true
    });

    await user.save();

    // 6️⃣ Clear OTP session
   delete req.session.otp;
delete req.session.otpExpiry;
delete req.session.tempUser;

    // 7️⃣ Login user
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



const loadLoginPage = async (req,res)=>{
 return res.render('user/login',{message:"feilds cannot be empty"})
}



const VerifyLogin = async(req,res)=>{
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
    
    if(!userExist){
        return res.render('user/login',{message:"Invalid Email_id"})
    }   
    // const passwordMatch = await bcrypt.compare(password,userExist.password)
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



const loadLoggedinHomepage = async(req,res)=>{

     let userData;
const userId = req.user?._id || req.session.user.id;
    // ✅ Google login (Passport)
    if (req.user) {
      userData = req.user;
      userData = await User.findById(userId);
    }
    
    // ✅ Normal login (Email + Password)
    else if (req.session.user) {
      //userData = await User.findById(req.session.user.id);
      userData = await User.findById(userId);
    }
    // ❌ Not logged in
    else {
      return res.redirect('/login');
    }

const categories = [
        { name: 'Shirts', image: '/images/Gemini_Generated_Image_akh47dakh47dakh4.png', bgColor: '#1c2e2a' },
        { name: 'T-Shirts', image: '/images/Gemini_Generated_Image_x08oidx08oidx08o.png', bgColor: '#1c2e2a' },
        { name: 'Pants', image: '/images/Gemini_Generated_Image_mwmaq9mwmaq9mwma.png', bgColor: '#1c2e2a' },
        { name: 'Shorts', image: '/images/Gemini_Generated_Image_bofzy3bofzy3bofz.png', bgColor: '#1c2e2a' }
    ];

    const newArrivals = [ { name: 'Shirts', image: '/images/Gemini_Generated_Image_1f58yn1f58yn1f58.png', bgColor: '#1c2e2a' },
        { name: 'T-Shirts', image: '/images/Gemini_Generated_Image_x08oidx08oidx08o.png', bgColor: '#2a423d' },
        { name: 'Pants', image: '/images/Gemini_Generated_Image_mwmaq9mwmaq9mwma.png', bgColor: '#314b5c' },
        { name: 'Shorts', image: '/images/Gemini_Generated_Image_bofzy3bofzy3bofz.png', bgColor: '#ffffff' }]; // Define this too so you don't get another error!
    const bestSellers = [ { name: 'Shirts', image: '/images/Gemini_Generated_Image_1f58yn1f58yn1f58.png', bgColor: '#1c2e2a' },
        { name: 'T-Shirts', image: '/images/Gemini_Generated_Image_x08oidx08oidx08o.png', bgColor: '#2a423d' },
        { name: 'Pants', image: '/images/Gemini_Generated_Image_mwmaq9mwmaq9mwma.png', bgColor: '#314b5c' },
        { name: 'Shorts', image: '/images/Gemini_Generated_Image_bofzy3bofzy3bofz.png', bgColor: '#ffffff' }];




    console.log(req.session.user)
    //const userData = await User.findById(req.session.user.id);
    res.render('user/loggedinHomepage',{
        user:userData,
        categories: categories, 
        newArrivals: newArrivals,
        bestSellers: bestSellers 
    })
}



const resendOtp = async (req, res) => {
  try {
    // 1️⃣ Get email from session
    if (!req.session.tempUser) {
      return res.redirect('/signup');
    }

    const email = req.session.tempUser.email;

    // 2️⃣ Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3️⃣ Save OTP in session (same place verifyOtp checks)
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 2 * 60 * 1000; // 2 min

    // 4️⃣ SEND OTP AGAIN (IMPORTANT)
    await sendOtp(email, otp);

    console.log("Resent OTP:", otp);

    // 5️⃣ Render verify page again
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



const loadProfile = async (req, res) => {
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




const loadforgetPassPage = async(req,res)=>{
    res.render('user/forgotpassword')
}



const sendOtpforForgot = async (req, res) => {
  try {
    console.log('step1');

    const { email } = req.body;
    console.log('step2');

    const user = await User.findOne({ email });
    console.log('step3');

    // ❌ USER NOT FOUND
    if (!user) {
      console.log('step4 - invalid email');
      return res.render('user/forgotpassword', {
        message: "Invalid email"
      });
    }

    // ✅ USER FOUND → CONTINUE
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('step5 OTP:', otp);

    req.session.forgotOtp = otp;
    req.session.forgotOtpExpiry = Date.now() + 5 * 60 * 1000;
    req.session.forgotUserId = user._id; // ✅ CORRECT
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


const verifyotpForget = async(req,res)=>{
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




const loadForgotOtp = (req, res) => {
  if (!req.session.forgotOtp) {
    //return res.redirect('/forgot-password');
    console.log('hello')
  }
  res.render('user/verifyotpPassreset',{error:null});
};



const loadResetPassword = (req, res) => {
  if (!req.session.forgotUserId) {
    return res.redirect('/login');
  }
  res.render('user/resetPassword',{error:null});
};


const resetPassword = async (req, res) => {
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

  // Clear session
  req.session.forgotOtp = null;
  req.session.forgotOtpExpiry = null;
  req.session.forgotUserId = null;

  res.redirect('/login');
}; 




const uploadProfileImage = async (req, res) => {
  try {
    
    const userId =
      req.user?._id ||
      req.session.user?._id ||
      req.session.user?.id;
     

    if (!req.file) {
      return res.redirect('/profile');
    }

    const imagePath = `/uploads/profile/${req.file.filename}`;

      const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: imagePath },
      { new: true }
    );

      req.session.user = updatedUser;
      if (req.session.user) {
      req.session.user.profilePic = imagePath;
    }  

    res.redirect('/profile');

  } catch (error) {
    console.log(error);
    res.redirect('/profile');
  }
};





const loadeditProfile = async(req,res)=>{
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



// const editProfile = async(req,res)=>{

//   console.log("req.user",req.user)
//   console.log("req.user",req.session.user)
   
//   const {name,password,confirmPassword} = req.body
//   console.log(req.body)

//   const currentUser = req.user || req.session.user

//   const userId =  currentUser._id || currentUser.id
//    const user = await User.findById(userId)

//   if(name==""){
//     res.render('user/editprofile',{error:'field cannot be empty',user:user})
//     console.log("hello1")
//   }
//   if(password==""){
//     res.render('user/editprofile',{error:'field cannot be empty',user:user})
//         console.log("hello2")

//   }
//   if(confirmPassword==""){
//     res.render('user/editprofile',{error:'field cannot be empty',user:user})
//         console.log("hello3")

//   }

//   if(password!==confirmPassword){
//     res.render('user/editprofile',{error:'password not matched',user:user})
//         console.log("hello4")

//   }
//   if (user.authProvider === 'google') {
//   // never touch password
//   delete req.body.password;
//   delete req.body.confirmPassword;
// }

    
   

//    if(!currentUser){
//     res.redirect('/login')
//    }

//     const hashedPassword = await bcrypt.hash(req.body.password, 10);
//     user.password=hashedPassword
   
//    await User.findByIdAndUpdate(userId,{name,password:hashedPassword},{new:true})

//    res.redirect('/profile')


// }


const editProfile = async (req, res) => {
  try {
    console.log("req.user:", req.user);
    console.log("req.session.user:", req.session.user);

    const { name, password, confirmPassword } = req.body;

    const currentUser = req.user || req.session.user;
    if (!currentUser) {
      return res.redirect('/login');
    }

    const userId = currentUser._id || currentUser.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.redirect('/login');
    }

    // ✅ NAME VALIDATION
    if (!name || name.trim() === "") {
      return res.render('user/editprofile', {
        error: 'Name cannot be empty',
        user
      });
    }

    // ✅ UPDATE NAME
    user.name = name;

    // ✅ PASSWORD LOGIC ONLY FOR LOCAL USERS
    if (user.authProvider === 'local') {

      // user wants to change password
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

        // ✅ HASH ONLY WHEN VALID PASSWORD EXISTS
        user.password = await bcrypt.hash(password, 10);
      }
    }

    // ❌ GOOGLE USERS NEVER TOUCH PASSWORD
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




const  loadupdateMail = async(req,res)=>{
  res.render('user/editemail')
}

const updateEmail = async(req,res)=>{
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



const  loadchangeEmailOtp = async(req,res)=>{
  res.render('user/verifyotpEmail',{error:null})
}


const verifychangeEmailOtp  = async(req,res)=>{
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





const loadAdressPage = async(req,res)=>{

  const currentUser = req.user || req.session.user


  const userId = currentUser._id || currentUser.id


  const user = await User.findById(userId)


  const addresses = await Address.find({userId})


  res.render('user/myAdress',{user,addresses})
}



const loadAddAddressPage = async(req,res)=>{
  res.render('user/addAdress')
}




const Addaddress = async(req,res)=>{
  try{

     const currentUser = req.user || req.session.user

     const user = currentUser._id || currentUser.id
    
     const {fullName,phone,addressLine,city,state,pincode,country} = req.body
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

     res.redirect('/profile/adresses')

  }
  catch(error){

    console.log(error)

  }


}




const LoadeditAdressPage = async(req,res)=>{
  
  const currentUser = req.user || req.session.user
  
  const user = currentUser._id || currentUser.id

  const address = await Address.findById(req.params.id)

  res.render('user/edit-adress',{user,address})

}




const updateAdress = async(req,res)=>{

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




const deleteAdress = async(req,res)=>{
  try{
      
      await Address.findByIdAndDelete(req.params.id)

      res.redirect('/profile/adresses')
       
  }
  catch(error){
    console.log(error)
  }
}




const setDefaultAdress = async(req,res)=>{
  try{
     const userId = req.user._id || req.session.user.id

     await Address.updateMany({userId},{isDefault:false})

     await Address.findByIdAndUpdate(req.params.id,{isDefault:true})

     res.redirect('/profile/adresses')

  }
  catch(error){
    console.log(error)
  }
}






module.exports = {
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
    setDefaultAdress
};
