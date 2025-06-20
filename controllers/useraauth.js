const User = require('../model/userSchema');

const Banner=require('../model/bannerSchema')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken');
const { renderusermanagement } = require('./adminauth');
const Coupon=require('../model/couponSchema')

require('dotenv').config()
const crypto=require('crypto')
const nodemailer=require('nodemailer');


const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,  
      pass: process.env.EMAIL_PASS,
    }
  });
  

const fetchValidCoupons=async(req,res)=>{
    try{
        const coupons=await Coupon.find({
            expiryDate:{$gte:new Date()}
        })
        res.render('user/offers',{coupons,user:req.user||null})
    }catch(err){
        res.status(400).send('failed to load coupons')
    }
}



const renderhomepage=async(req, res) => {
   try{
    const banners=await Banner.find()
      // Optional: log to verify
    console.log("Fetched banners:", banners);
    res.render('user/home',{user:req.user ||null,banners});
   }catch(err){
    console.log('error loading home page')
    res.status(400).send('error loading home page')
   }
       
    
}

const renderaboutpage=(req,res)=>{
     
      
       
    res.render('user/about',{ user:req.user})
}
const rendercontactus=(req,res)=>{
    res.render('user/contactus',{user:req.user})
}
const renderloginpage=(req,res)=>{
    res.render('user/login',{msg: null,successMsg:null} )
}

const rendersignuppage=(req,res)=>{
    res.render('user/signup',{msg: null} )
}

const renderotppage=(req,res)=>{
    const userId=req.params.id;
    res.render('user/verifyOtp',{userId,msg:null})
}




const signup=async(req,res)=>{
    try{
        const{name,email,password,confirmPassword}=req.body

        if(password!==confirmPassword){
            return res.render('user/signup',{
                msg:"password do not match"
            })
        }

        const existinguser=await User.findOne({email});
        if(existinguser){
           return res.render('user/signup',{msg:'Email already registered with another account. Use another email'})
        }
        console.log('recievd password')

        const saltroundes=10;
        const hashedpassword=await bcrypt.hash(password,saltroundes)
        const otp = crypto.randomInt(100000, 1000000);
        const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes expiry (as you wanted earlier)
        console.log(otp)
        
        console.log('hashedpassword',hashedpassword)
        const newUser=new User({
            name,
            email,
            password:hashedpassword,
            otp,
            otpExpiry,
            isVerified:false,
        })
        await newUser.save()
        
        try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: email,
              subject: 'OTP Verification',
              text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
            });
            console.log('Email sent successfully');
          } catch (emailError) {
            console.log('❌ Failed to send email:', emailError);
          }
          const token = jwt.sign({ userid: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

          // Send the JWT token as a cookie or in the response body
          res.cookie('token', token, { httpOnly: true }); 
          
        console.log("user saved successfully")
        res.redirect(`/verify-otp/${newUser._id}`);

    }catch(err){
        console.log(err);
        res.render('user/signup', { msg: 'Error during signup' });
    }
}
const verifyOtp=async(req,res)=>{
    try{

    
        const{userId,otp}=req.body;
        const banners=await Banner.find()
        const user=await User.findById(userId)
        if(!user){
            return res.render("user/verifyOtp",{
                userId,
                msg:'User not found'
            })
        }

    
    const enterdOtp=String(otp).trim()
    const savedOtp=String(user.otp).trim()

    console.log('Enterd otp:',enterdOtp)
    console.log('saved otp in DB:',savedOtp)
    console.log('Otp expiry:',user.otpExpiry)
    console.log('Current time :',Date.now())

    if(enterdOtp!==savedOtp||Date.now()>user.otpExpiry){
        return res.render('user/verifyOtp',{
            userId,
            msg:'Invalid or expired OTP. Try again.'
        })
    }
    //otp is valid
    user.isVerified=true;
    user.otp=null;
    user.otpExpiry=null;
    await user.save()

    res.render('user/home',{user, banners,msg:'signup successfull'})
}
    catch(err){
        console.log('error in otp verification',err)
        res.render('user/verifyOtp',{
            userId:req.body.userId,
            msg:"error verifying otp",
        })
    }
}
  
  
const login=async(req,res)=>{
    try{
        const{email,password}=req.body
        
        const user=await User.findOne({email})
        if(!user){
           return res.render('user/login',{msg:"invalid credantails",successMsg:null})
        }
        if(user.isBlocked){
            return res.render('user/login',{successMsg:null,msg:'your contact have been blocked. contact admin'})
        }
    const ismatch= await bcrypt.compare(password,user.password)
        if(!ismatch){
             return res.render('user/login',{msg: "Email or password invalid", successMsg: null})
        }
        const token=jwt.sign({userid:user._id,email:user.email},process.env.JWT_SECRET,
            {expiresIn:'7d'})//token expires in 1 hour
            console.log(token)

            if(!token){
                return res.status(500).json({msg:'error genarating token ,please try again '})
            }
            res.cookie('token', token, { httpOnly: true });


            console.log("login succesfull")
            res.redirect('/home')

    }catch(err){
        res.status(500).send("error during login")
        console.log(err)
    }
}


const logout=(req,res)=>{
    res.clearCookie('token', { httpOnly: true });
    console.log('user logouted successfully')
    res.redirect('/home')
}


const renderforgotpassword=(req,res)=>{
    res.render('user/forgotpassword',{msg:null})
}

const handleforgotpassword=async(req,res)=>{
    try{

    const {email}=req.body;
    const banners=await Banner.find()
    const user =await User.findOne({email})
    if(!user){
        return res.render('user/forgotpassword',{msg:'no user found with this email'})
    }

    const otp=crypto.randomInt(100000,999999);
    const otpExpiry=Date.now() + 5 * 60 * 1000;
    console.log(otp)

    user.otp=otp;
    user.otpExpiry=otpExpiry;
    await user.save()

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Reset Password OTP',
        text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      });
      res.render('user/resetpassword',{email,banners,msg:null})
    }catch(err){
        console.log("error in forgot password",err)
        res.render('user/forgotpassword',{msg:"something went wrong"})
    }
}

const renderresetpassword=(req,res)=>{
    res.render('user/resetpassword',{email,msg:null})
}

const handleresetpassword=async(req,res)=>{
    try{
        const {email,otp,password,confirmPassword}=req.body;
        if(password !==confirmPassword){
            return res.render('user/resetpassword',{email,successMsg:null,msg:"password do not match"})
        }
    const user=await User.findOne({email})
    if(!user){
       return res.render('user/resetpassword',{email,successMsg:null,msg:'user not found'})
    }
    const enterotp=String(otp).trim()
    const saveotp=String(user.otp).trim()
    if(!user.otp||enterotp!==saveotp || Date.now() > user.otpExpiry){
        return res.render('user/resetpassword',{email,successMsg:null,msg:'invalid or expired otp'})
    }
  const hashedpassword=await bcrypt.hash(password,10)
  user.password=hashedpassword;
  user.otp=null;
  user.otpExpiry=null;

  await user.save()
  res.render('user/login',{msg:null,successMsg:'password reset successfull pleaselogin'})


    }catch(err){
        console.log("error resetting password",err)
        res.render('user/resetpassword',{  email: req.body.email || '', msg:'error resetting password please try again',successMsg:null})
    }
}
const getuserAccount=async(req,res)=>{
    try{
        const userId=req.user.userid
        const user=await User.findById(userId)
        if(!user)return res.redirect('/login')
        res.render('user/my-account', { user,addresses:user.addresses||[], message: req.query.message||null });


    }catch(err){
        console.log('error in user account',err)
         
        res.clearCookie('token')
        res.redirect('/login')

    }
}
const editProfile=async(req,res)=>{
    try{
        const userId=req.user.userid
        const{name,email}=req.body
        
       const updateUser = await User.findByIdAndUpdate(userId,{name,email},{new:true})
        if (!updateUser ) {
      return res.status(404).send("User not found.");
    }
        res.redirect('/my-account')
    }catch(err){
        console.error('error updating profile',err)
        res.status(400).send('error updating profile',err)
    }
}
const addAddress=async(req,res)=>{
    try{
        const userId=req.user.userid
        const {fullName,address,city,postalCode,phone}=req.body
        await User.findByIdAndUpdate(userId,{
            $push:{
                addresses:{fullName,address,city,postalCode,phone},
            },
        })
        res.redirect('/my-account')
    }catch(err){
    console.error('error adding address',err)
    res.redirect('/myaccount?message=failed to add address')
    }
}

const deleteAddress=async(req,res)=>{
    try{
        const userId=req.user.userid
        const {addressId}=req.body
        await User.findByIdAndUpdate(userId,{
            $pull:{
                addresses:{_id:addressId}
            }
        })
        res.redirect('/my-account?message=Address deleted successfully')
    }catch(err){
        console.log('error deleting address',err)
        res.redirect('/my-account?message=failed deleting address')
    }
}

module.exports={renderhomepage,renderaboutpage,rendercontactus,renderloginpage,rendersignuppage,login,signup,logout,verifyOtp,renderotppage,renderforgotpassword,handleforgotpassword,renderresetpassword,handleresetpassword,getuserAccount,editProfile,addAddress,deleteAddress,fetchValidCoupons}