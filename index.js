require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app =express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');

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

    // instructors apis
    app.get('/instructors',async(req,res)=>{
        const result = await instructorCollection.find().toArray()
        res.send(result)
    })

    // users apis
    app.post('/users',async(req,res)=>{
      const user=req.body
      console.log(user);
      const query={email: user.email}
      const existingUser=await userCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists'})
      }
      const result=await userCollection.insertOne(user)
      res.send(result)
    })


    // classes api
    app.get('/classes',async(req,res)=>{
        const result =await classCollection.find().toArray()
        res.send(result)
    })

    app.post('/pendingclasses',async(req,res)=>{
      const newClass= req.body
      const result = await pendingClassCollection.insertOne(newClass)
      res.send(result)
    })

    app.get('/myclasses/:email',async(req,res)=>{
      const email=req.params.email
      // console.log(email);
      const query={instructorEmail:email}
      const result=await pendingClassCollection.find(query).toArray()
      res.send(result)
    })

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