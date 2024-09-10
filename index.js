const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { ServerApiVersion, MongoClient } = require('mongodb')

const port = process.env.RUNNING_PORT || 5000


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wukjrsy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const userCollections = client.db('healthDB').collection('users')


        // user relatad api (user info get request)
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = {user_email : email}
            const result = await userCollections.findOne(query)
            res.send(result)
        })

        //user info store post request
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await userCollections.insertOne(user)
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.use("/", (req, res) => {
    res.send("Healthcare Diagnostic Server Start")
})


app.listen(port, () => {
    console.log(`Server runnig port : ${port}`)
})