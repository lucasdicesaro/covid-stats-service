const mongoose = require('mongoose')

const occurrenceSchema = new mongoose.Schema({
    symptomDate: {
        type: Date,
        required: true
    },
    eventId: {
        type: Number,
        required: true
    },
    age: {
        type: Number,
        required: true
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
        type: String, // TODO change it to Boolean, after file convertion
        required: true
    }
})


module.exports = mongoose.model('Ocurrence', occurrenceSchema)