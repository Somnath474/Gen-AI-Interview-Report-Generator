const express=require("express");
const cookieParser=require("cookie-parser")
const app=express();
app.use(express.json());
app.use(cookieParser())

/*reuire all the routes here*/
const authRouter=require('./routes/auth.routes')
// using all the routes here
app.use("/genai/auth",authRouter)


module.exports=app; 