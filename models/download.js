const mongoose = require('mongoose')

const downloadSchema = new mongoose.Schema({
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

// Note deltaSize could be calculated everytime a Download is requested, 
// I assumming (by simplicity) that Government never changes already downloaded dates
// Otherwise, I have to do the math or maintain a cache mechanism

module.exports = mongoose.model('Download', downloadSchema)