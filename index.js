const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const port = process.env.RUNNING_PORT || 5000


app.use(cors())
app.use(express.json())

app.use("/", (req, res) => {
    res.send("Healthcare Diagnostic Server Start")
})


app.listen(port, () => {
    console.log(`Server runnig port : ${port}`)
})