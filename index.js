const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { ServerApiVersion, MongoClient, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_PAYMENT_SECRATE_API_KEY)

const port = process.env.RUNNING_PORT || 5000


app.use(
    cors(
        {
            origin: [
                "http://localhost:5173",
                "http://localhost:5174",
                "https://healthcare-diagnostic-e1ec0.web.app",
                "https://healthcare-diagnostic-e1ec0.firebaseapp.com",
            ]
        }
    )
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

        const db = client.db('healthDB')
        const usersCollection = db.collection('users')
        const bannarContent = db.collection('banner')
        const testCollection = db.collection('allTest')
        const tipesCollection = db.collection('healthTipes')
        const bookingsCollection = db.collection('Booking')

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
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(401).send({ message: "Forbidden access" })
            }
            next()
        }

        // admin verify Route
        app.get('/users/admin/:email', TokenVerify, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            return res.send({ admin })
        })


        // all user admin control related route

        // find all User data by admin
        app.get('/users', TokenVerify, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        // get user use email by admin 
        app.get('/users/:email', TokenVerify, verifyAdmin, async (req, res) => {
            const email = req.params.email
            console.log(email)
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })

        // Add test by admin
        app.post('/addTest', TokenVerify, verifyAdmin, async (req, res) => {
            const testData = req.body
            // console.log(testData)
            const result = await testCollection.insertOne(testData)
            res.send(result)
        })

        // Update test by admin
        app.put('/updateTest/:id', TokenVerify, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const updateData = req.body
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...updateData,
                }
            }
            // console.log(testData)
            const result = await testCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })


        // delete test by admin
        app.delete('/deleteTest/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await testCollection.deleteOne(query)
            res.send(result)
        })

        // Add bannar by admin
        app.post('/addBannar', TokenVerify, verifyAdmin, async (req, res) => {
            const bannar = req.body
            const result = await bannarContent.insertOne(bannar)
            res.send(result)
        })

        // all banar get
        app.get('/allBannar', async (req, res) => {
            const result = await bannarContent.find().toArray()
            res.send(result)
        })

        // selected bannar isActive Status Change
        app.put('/activeBannar/:id', async (req, res) => {
            const bannarValue = req.body;
            const id = req.params.id

            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    ...bannarValue
                }
            }

            const options = { upsert: true }

            const result = await bannarContent.updateOne(query, updateDoc, options)
            res.send(result)

        })

        // Delete Bannar by Admin
        app.delete('/deleteBannar/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bannarContent.deleteOne(query)
            res.send(result)

        })


        // change role by admin
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
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })


        // =================================================================
        // ================== User Ralated route =============================



        // Booking or Appoinment
        app.post('/booking', TokenVerify, async (req, res) => {
            const bookingData = req.body
            const result = await bookingsCollection.insertOne(bookingData)

            // 3. update booking Count
            // const updateDoc = {
            //     $set: {
            //         $inc: {
            //             book_Count: 1
            //         }
            //     }
            // }
            res.send(result)
        })


        // reservation all data
        app.get('/reservation', async (req, res) => {
            const search = req.query.search
            const result = await bookingsCollection.find().toArray()
            res.send(result)
        })

        // delete Reservation
        app.delete('/deleteReservation/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query)
            res.send(result)
        })


        // give reservation result 
        app.patch(`/resultSubmit/:id`, async (req, res) => {

            const id = req.params.id
            const query = { _id: new ObjectId(id) }

            const updateDocument = {
                $set: {
                    status: 'Delivered'
                }
            }

            const options = { upsert: true }
            const result = await bookingsCollection.updateOne(query, updateDocument, options)
            res.send(result)
        })


        // user appoinment data by email
        app.get('/myApponment/:email', async (req, res) => {
            const email = req.params.email
            const query = { ['user.email']: email }
            const result = await bookingsCollection.find(query).toArray()
            res.send(result)
        })


        // appoinment cancel route
        app.delete('/cancel/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query)
            res.send(result)

        })


        // 


        // get update slotes
        // app.put('/all-test/:id', async (req, res) => {
        //     const id = req.params.id
        //     const updateSlots = req.body
        //     console.log(updateSlots)
        //     const query = { _id: id }
        //     const options = { upsert: true }
        //     const updateDoc = {
        //         $set: {
        //             ...updateSlots
        //         }
        //     }
        //     const result = await testCollection.updateOne(query, updateDoc, options)
        //     res.send(result)
        // })




        // common route 

        // get bannar text
        app.get('/bannarText', async (req, res) => {
            const result = await bannarContent.find().toArray()
            res.send(result)
        })


        // get All test
        app.get('/allTest', async (req, res) => {
            const size = parseInt(req.query.size)
            const page = parseInt(req.query.page) - 1
            // const inputDate = req.query.date
            // console.log(inputDate)

            const result = await testCollection.find().skip(size * page).limit(size).toArray()
            res.send(result)
        })


        // all test count for pagination
        app.get('/all-item', async (req, res) => {
            // const result = await testCollection.estimatedDocumentCount()
            const count = await testCollection.countDocuments()
            res.send({ count })
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



        // user singup data store
        app.put('/userInfo', async (req, res) => {
            const user = req.body
            const query = { email: user?.email }

            // save user for the first time
            const options = { upsert: true }

            const updateDoc = {
                $set: {
                    ...user
                }
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })


        // payment related api 
        app.post('/create-payment-intent', TokenVerify, async (req, res) => {
            const price = req.body.price
            const priceInCent = parseFloat(price) * 100
            if (!price || priceInCent < 1) return

            const { client_secret } = await stripe.paymentIntents.create({
                amount: priceInCent,
                currency: "usd",
                automatic_payment_methods: {
                    enabled: true,
                },
            })
            res.send({ clientSecret: client_secret })
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