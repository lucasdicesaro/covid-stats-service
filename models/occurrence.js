const mongoose = require('mongoose')

const occurrenceSchema = new mongoose.Schema({
    symptomDate: {
        type: Date,
        required: false // some rows has empty symptomDate
    },
    eventId: {
        type: Number,
        required: true
    },
    age: {
        type: Number,
        required: false // some rows has empty age
    },
    genre: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    deceased: {
        type: String,
        required: true
    }
})


module.exports = mongoose.model('Ocurrence', occurrenceSchema)