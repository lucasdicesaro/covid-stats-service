const mongoose = require('mongoose')

const batchSchema = new mongoose.Schema({
    executionDate: {
        type: Date,
        required: true
    },
    lastEventId: {
        type: Number,
        required: true
    },
    deltaSize: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('Batch', batchSchema)