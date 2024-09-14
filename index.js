const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { ServerApiVersion, MongoClient, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const port = process.env.RUNNING_PORT || 5000


app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
            "https://healthcare-diagnostic-server.vercel.app/",
            "https://healthcare-diagnostic-e1ec0.firebaseapp.com/",
        ]
    })
);
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
        const bannarContent = client.db('healthDB').collection('banner')
        const testCollection = client.db('healthDB').collection('allTest')
        const tipesCollection = client.db('healthDB').collection('healthTipes')

        // token related api

        //token create
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRATE, { expiresIn: '1h' })
            res.send({ token })
        })

        //Token varify middleware 
        const TokenVerify = (req, res, next) => {
            // console.log("inside verify token ", req)
            // console.log()
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "Unauthorize access" })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRATE, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: "Unauthorize access" })
                }
                req.decoded = decoded;
                // console.log(req.decoded.email)
                next()
            })
        }


        // Admin Verify middleware
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollections.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(401).send({ message: "Forbidden access" })
            }
            next()
        }

        // admin verify
        app.get('/users/admin/:email', TokenVerify, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            }

            const query = { email: email }
            const user = await userCollections.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            return res.send({ admin })
        })


        // all user admin control related route

        // find all User data by admin
        app.get('/users', TokenVerify, verifyAdmin, async (req, res) => {
            const result = await userCollections.find().toArray()
            res.send(result)
        })

        // get user use email by admin 
        app.get('/users/:email', TokenVerify, verifyAdmin, async (req, res) => {
            const email = req.params.email
            console.log(email)
            const query = { email: email }
            const result = await userCollections.findOne(query)
            res.send(result)
        })

        // Add test by admin
        app.post('/addTest', TokenVerify, verifyAdmin, async (req, res) => {
            const testData = req.body
            const result = await testCollection.insertOne(testData)
            res.send(result)
        })

        // Add bannar by admin
        app.post('/addBannar', TokenVerify, verifyAdmin, async (req, res) => {
            const testData = req.body
            const result = await bannarContent.insertOne(testData)
            res.send(result)
        })


        // admin change role
        app.put('/users/role', async (req, res) => {
            const users = req.body
            const email = users.email
            const query = { email: email }

            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...users
                }

            }
            console.log(updateDoc)
            // if existing user try to change his role
            const result = await userCollections.updateOne(query, updateDoc, options)
            res.send(result)
        })




        // common route 

        // get bannar text
        app.get('/bannarText', async (req, res) => {
            const result = await bannarContent.find().toArray()
            res.send(result)
        })


        // get All test
        app.get('/allTest', async (req, res) => {
            const result = await testCollection.find().toArray()
            res.send(result)
        })

        // get all doctors tipes
        app.get('/doctorTipes', async (req, res) => {
            const result = await tipesCollection.find().toArray()
            res.send(result)
        })

        // service Details page
        app.get('/allTest/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await testCollection.findOne(query)
            res.send(result)
        })



        // user data store
        app.put('/users', async (req, res) => {
            const user = req.body
            const query = { email: user?.email }
            console.log('user data store route', query)

            const isExist = await userCollections.findOne(query)
            if (isExist) {
                // if existing user try to change his role
                await userCollections.updateOne(query, {
                    $set: {
                        status: user?.status
                    },

                }, { upsert: true })

            } else {
                // if existing user login again
                return res.send(isExist)
            }


            // save user for the first time
            const options = { upsert: true }

            const updateDoc = {
                $set: {
                    ...user
                }
            }
            const result = await userCollections.updateOne(query, updateDoc, options)
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