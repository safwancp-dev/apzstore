require('dotenv').config()
const express=require('express')


const mongoose= require('mongoose')
const path=require('path')
const cors=require('cors')

const cookieparser=require('cookie-parser')
const userRouter=require('./routes/userroutes.js')
const adminRouter=require('./routes/adminroutes.js')
const cartCount = require('./middleware/cartCount.js')
const authenticateUser = require('./middleware/userVerify.js')
const wishlistCount = require('./middleware/wishlistCount.js')
const session = require('express-session');
const nocache = require('nocache')

const app=express()


app.use(nocache())

app.use(cookieparser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')))

app.use(cors({Credential:true}))

app.use(session({
  secret: 'your-secret-key', // 🔒 replace with a secure random string
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  }
}));



mongoose.connect(process.env.CLUSTER_URI)

.then(()=>{
    console.log("mongodb connected")
})
.catch((err)=>{
    console.log("mongodb not connected",err)
})

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); // or the view engine you're using


app.use(authenticateUser,cartCount)
app.use(authenticateUser,wishlistCount)

app.use('/',userRouter)
app.use('/admin',adminRouter)


app.listen(process.env.PORT,()=>{
    console.log(`server started at http://localhost:${process.env.PORT}/home`);
})
