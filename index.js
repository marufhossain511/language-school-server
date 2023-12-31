require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app =express()
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())

const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization
  if(!authorization){
    return res.status(401).send({error:true,message:'unauthorized access'})
  }
  const token=authorization.split(' ')[1]
  if(!token){
    return res.status(401).send({error:true,message:'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
    if(error){
      return res.status(401).send({error:true,message:'unauthorized access'})
    }
    req.decoded=decoded
    next()
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vvlmqn2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser:true,
  useUnifiedTopology:true,
  maxPoolSize:10,
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("summerSchoolDB").collection("classes");
    const instructorCollection = client.db("summerSchoolDB").collection("instructors");
    const userCollection = client.db("summerSchoolDB").collection("users");
    const pendingClassCollection = client.db("summerSchoolDB").collection("pendingClasses");
    const cartCollection = client.db("summerSchoolDB").collection("carts");
    const paymentCollection = client.db("summerSchoolDB").collection("payments");
    const enrolledClassCollection = client.db("summerSchoolDB").collection("enrolledClass");


    // jwt
    app.post('/jwt',(req,res)=>{
      const user=req.body
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:"1h"})
      res.send({token})
    })

    // payment-intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount=parseInt(price*100)
    
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types:['card']
      });
    
      res.send({
        clientSecret:paymentIntent.client_secret,
      });
    });

    // Use verifyJWT before using verifyAdmin
    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email
      const query={email:email}
      const user = await userCollection.findOne(query)
      if(user?.role !== 'admin'){
          return res.status(403).send({error:true,message:'forbidden'})
      }
      next()
     }

    // payment

    app.post('/payments',async(req,res)=>{
      const payment=req.body
      // console.log(payment);
      const insertedResult= await paymentCollection.insertOne(payment) 
      const query={_id: new ObjectId(payment.cartItems)}
      const deleteResult = await cartCollection.deleteOne(query)
      res.send({insertedResult,deleteResult})
    })
    
    app.get('/payment/:id',async(req,res)=>{
      const id = req.params.id
      const query={_id:new ObjectId(id)}
      const result = await cartCollection.findOne(query)
      res.send(result)
    })



    app.get('/payments',verifyJWT,async(req,res)=>{
      const email=req.query.email
      const result = await paymentCollection.find({email:email}).sort({date:-1}).toArray()
      res.send(result)
    })

    // instructors apis
    app.get('/instructors',async(req,res)=>{
        const result = await instructorCollection.find().toArray()
        res.send(result)
    })

    app.post('/instructors',async(req,res)=>{
         const newInstructor = req.body
        //  console.log(newInstructor);
         const result =await instructorCollection.insertOne(newInstructor)
         res.send(result)
    })

    // carts apis
    app.post('/cart',async(req,res)=>{
      const addClass=req.body
      // console.log(addClass);
      const result = await cartCollection.insertOne(addClass)
      res.send(result)
    })

    app.get('/carts',verifyJWT,async(req,res)=>{
      const email=req.query.email
      const result = await cartCollection.find({email:email}).toArray()
      res.send(result)
    })

    app.delete('/carts/:id',async(req,res)=>{
      const id=req.params.id
      const query={_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })

    // enrolledClasses
    app.post('/enrolledclass',async(req,res)=>{
      const classes=req.body
      const result = await enrolledClassCollection.insertOne(classes)
      res.send(result)
    })

    app.get('/enrolledclasses',verifyJWT,async(req,res)=>{
      const email = req.query.email
      const result =await enrolledClassCollection.find({email:email}).sort({date:-1}).toArray()
      res.send(result)     
    })

    // users apis
    app.post('/users',async(req,res)=>{
      const user=req.body
      // console.log(user);
      const query={email: user.email}
      const existingUser=await userCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists'})
      }
      const result=await userCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users',verifyJWT,verifyAdmin,async(req,res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/:email',async(req,res)=>{
      const email= req.params.email
      const result = await userCollection.findOne({email:email})
      res.send(result)
    })

    app.patch('/makeadminuser/:id',verifyJWT,verifyAdmin,async(req,res)=>{
      const id = req.params.id
      // console.log(id);
      const query={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
         role:'admin'
        }
      }
      const result = await userCollection.updateOne(query,updateDoc)
      res.send(result)
    })

     app.patch('/makeinstructoruser/:id',verifyJWT,verifyAdmin,async(req,res)=>{
      const id = req.params.id
      console.log(id);
      const query={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
         role:'instructor'
        }
      }
      const result = await userCollection.updateOne(query,updateDoc)
      res.send(result)
    })


    // classes api
    app.get('/classes',async(req,res)=>{
        const result =await classCollection.find().toArray()
        res.send(result)
    })

    // verify Instructor
    const verifyInstructor=async(req,res,next)=>{
      const email=req.decoded.email
      const query={email:email}
      const user = await userCollection.findOne(query)
      if(user?.role !== 'instructor'){
          return res.status(403).send({error:true,message:'forbidden'})
      }
      next()
  }
    
    app.patch('/classes',async(req,res)=>{
      const classId=req.body
      // console.log(classId);
      const query={_id: new ObjectId(classId.classId)}
      const classObj=await classCollection.findOne(query)
      if(classObj){
        const updateDoc={
          $set:{       
             availableSeat:classObj.availableSeat - 1,
             students:classObj.students + 1
          }
        }
        const result = await classCollection.updateOne(query,updateDoc)
        res.send(result)
      }
    })


  

    app.patch('/classes/:id',async(req,res)=>{
      const id = req.params.id
      const classInfo=req.body
      // console.log(classInfo.price,classInfo.availableSeat);
      const query={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
         price:classInfo.price,
         availableSeat:classInfo.availableSeat
        }
      }
      const result= await classCollection.updateOne(query,updateDoc)
      res.send(result)
    })


    app.get('/classbyname',async(req,res)=>{
      const name=req.query.name
      const query={className:name}
      const result = await classCollection.findOne(query)
      res.send(result)
    })

    app.post('/pendingclasses',async(req,res)=>{
      const newClass= req.body
      const result = await pendingClassCollection.insertOne(newClass)
      res.send(result)
    })

    app.get('/pendingclasses/:id',async(req,res)=>{
      const id =req.params.id
      const query={_id: new ObjectId(id)}
      const result = await pendingClassCollection.findOne(query)
      res.send(result)
    })

    app.patch('/pendingclasses/:id',async(req,res)=>{
      const id = req.params.id
      const filter={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          status:'approved'
        },
      };
      const result=await pendingClassCollection.updateOne(filter,updateDoc)
      res.send(result)

    })

    app.patch('/instructorClass/:id',async(req,res)=>{
      const id = req.params.id
      const {price}=req.body
      console.log(price);
      const filter={_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          price:price
        },
      };
      const result=await pendingClassCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.put('/denyclasses/:id',async(req,res)=>{
      const id = req.params.id
      console.log(id);
      const {feedback}=req.body
      console.log(feedback);
      const filter={_id: new ObjectId(id)}
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status:'deny',
          feedback:feedback
        },
      };
      const result=await pendingClassCollection.updateOne(filter,updateDoc,options)
      res.send(result)
    })

    app.post('/approvedclasses',async(req,res)=>{
      const newClass=req.body
      const result=await classCollection.insertOne(newClass)
      res.send(result)
    })

    app.get('/myclasses/:email',async(req,res)=>{
      const email=req.params.email
      // console.log(email);
      const query={instructorEmail:email}
      const result=await pendingClassCollection.find(query).toArray()
      res.send(result)
    })


    app.get('/pendingClasses',async(req,res)=>{
      const result = await pendingClassCollection.find().toArray()
      res.send(result)
    })



    app.get('/popularclasses',async(req,res)=>{
      const cursor= await classCollection.find().sort({students:-1}).limit(6).toArray()
      res.send(cursor)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('summer school is running')
})

app.listen(port,()=>{
    console.log(`summer school is running on port ${port}`);
})