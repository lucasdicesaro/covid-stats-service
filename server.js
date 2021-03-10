require('dotenv').config()

const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')

mongoose.connect(process.env.DATABASE_HOST, { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection
db.on('error', (error) => { console.error(error) })
db.once('open', () => { console.log('Database connected') })

app.use(cors())
app.use(express.json())

const covidRouter = require('./routes/covid')
app.use('/covid', covidRouter)

const occurrenceRouter = require('./routes/occurrences')
app.use('/occurrences', occurrenceRouter)

const batchRouter = require('./routes/batches')
app.use('/batches', batchRouter)

app.listen(3000, () => console.log('Server Started'))