require('dotenv').config()

const express = require('express')
const app = express()
const mongoose = require('mongoose')

mongoose.connect(process.env.DATABASE_HOST, { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection
db.on('error', (error) => { console.error(error) })
db.once('open', () => { console.log('Database connected') })

app.use(express.json())

const covidRouter = require('./routes/covid')
app.use('/covid', covidRouter)

app.listen(3000, () => console.log('Server Started'))