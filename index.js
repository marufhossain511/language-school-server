require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app =express()
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vvlmqn2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
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


    // payment

    app.post('/payments',async(req,res)=>{
      const payment=req.body
      const insertedResult= await paymentCollection.insertOne(payment) 
      const query={_id: {$in: payment.cartItems.map(id=> new ObjectId(id))}}
      const deleteResult = await cartCollection.deleteMany(query)
      res.send({insertedResult,deleteResult})
    })

    app.get('/payments',async(req,res)=>{
      const email=req.query.email
      const result = await paymentCollection.find({email:email}).toArray()
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

    app.get('/carts',async(req,res)=>{
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
      const result = await enrolledClassCollection.insertMany(classes)
      res.send(result)
    })

    app.get('/enrolledclasses',async(req,res)=>{
      const email = req.query.email
      const result =await enrolledClassCollection.find({email:email}).toArray()
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

    app.get('/users',async(req,res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/:email',async(req,res)=>{
      const email= req.params.email
      const result = await userCollection.findOne({email:email})
      res.send(result)
    })

    app.patch('/makeadminuser/:id',async(req,res)=>{
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

     app.patch('/makeinstructoruser/:id',async(req,res)=>{
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

    // app.patch('/classseats/:id',async(req,res)=>{
    //   const id =req.params.id
    //   const query={_id: new ObjectId(id)}
    //   const course=await classCollection.findOne(query)
    //   const updateDoc={
    //     $set:{
    //       availableSeat:course.availableSeat -1
    //     }
    //   }
    //   const result=
    // })

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

    // app.get('/myclasses/:id',async(req,res)=>{
    //   const id =req.params.id
    //   const query={_id: new ObjectId(id)}
    //   const result = await pendingClassCollection.findOne(query)
    //   res.send(result)
    // })


    app.get('/popularclasses',async(req,res)=>{
      const cursor= await classCollection.find().limit(6).toArray()
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