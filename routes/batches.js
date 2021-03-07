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
        // TODO double check error code
        res.status(500).json({ message: error.message})
    }
})

// Delete batch
router.delete('/:id', getBatch, async (req, res) => {
    try {
        await res.batch.remove()
        res.json({ message: 'Batch deleted'})
    } catch (error) {
        res.status(500).json({ message: error.message})
    }
})

async function getBatch(req, res, next) {
    let batch
    try {
        batch = await Batch.findById(req.params.id)
        if (batch == null) {
            return res.status(404).json({ message: 'Cannot find occurence' })
        }
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
    res.batch = batch
    next()
}



module.exports = router