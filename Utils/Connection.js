import mongoose from 'mongoose';
const url = "mongodb+srv://ADMIN:6etcZ4TsBAn6LUqQ@crudapp.djxuw.mongodb.net/ShareChat?retryWrites=true&w=majority&appName=CRUDAPP";

mongoose.connect(url,{
    
}).then(()=>{
    console.log("connection is successful..");
}).catch((error)=>{
    console.log(error);
})

export default mongoose;