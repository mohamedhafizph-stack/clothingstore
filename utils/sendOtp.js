const nodemailer = require('nodemailer')

const sendOtp = async (email,otp)=>{

    const transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
        }
    })

 await transporter.sendMail({
    from:'mh3312711@gmail.com',
    to:email,
    subject:"email verification",
    html: `<h2>Your OTP is: ${otp}</h2><p>Valid for 5 minutes</p>`
 })

}
module.exports={sendOtp}