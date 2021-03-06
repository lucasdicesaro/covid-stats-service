const express = require('express')
const app = express()

const covidRouter = require('./routes/covid')
app.use('/covid', covidRouter)

app.listen(3000, () => console.log('Server Started'))