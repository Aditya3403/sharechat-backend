import mongoose from 'mongoose';
const url = process.env.MONGODB_URL;

mongoose.connect(url,{
    
}).then(()=>{
    console.log("connection is successful..");
}).catch((error)=>{
    console.log(error);
})

export default mongoose;