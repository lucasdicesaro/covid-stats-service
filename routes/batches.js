const express = require('express')
const router = express.Router()
const Batch = require('../models/batch')


// Find all batches
router.get('/', async (req, res) => {
    const batches = await Batch.find()
    res.json(batches)
})

// Create batch
router.post('/', async (req, res) => {

    const batch = new Batch({
        executionDate: req.body.executionDate,
        lastEventId: req.body.lastEventId,
        deltaSize: req.body.deltaSize
    })

    try {
        const newBatch = await batch.save()
        res.json(newBatch)
    } catch (error) {
        // 400 Assuming user input errors
        res.status(400).json({ message: error.message })
    }
})

// Updating batch
router.patch("/one/:id", getBatch, async (req, res) => {
    if (req.body.executionDate != null) {
        res.batch.executionDate = req.body.executionDate;
    }
    if (req.body.lastEventId != null) {
        res.batch.lastEventId = req.body.lastEventId;
    }
    if (req.body.deltaSize != null) {
        res.batch.deltaSize = req.body.deltaSize;
    }
    try {
        const updatedBatch = await res.batch.save();
        res.json(updatedBatch);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
})

// Delete batch
router.delete('/one/:id', getBatch, async (req, res) => {
    try {
        await res.batch.remove()
        res.json({ message: 'Batch deleted' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// Delete all
router.delete('/all', async (req, res) => {
    try {
        await Batch.deleteMany({})
        res.json({ message: 'Batches deleted' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

async function getBatch(req, res, next) {
    let batch
    try {
        batch = await Batch.findById(req.params.id)
        if (batch == null) {
            return res.status(404).json({ message: 'Cannot find batch' })
        }
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
    res.batch = batch
    next()
}



module.exports = router