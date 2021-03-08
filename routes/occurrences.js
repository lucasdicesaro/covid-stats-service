const express = require('express')
const router = express.Router()
const Occurrence = require('../models/occurrence')


// Find all occurrences
router.get('/', async (req, res) => {
    const occurrences = await Occurrence.find()
    res.json(occurrences)
})

// Create occurrence
router.post('/', async (req, res) => {

    const occurrence = new Occurrence({
        eventId: req.body.eventId,
        symptomDate: req.body.symptomDate,
        age: req.body.age,
        genre: req.body.genre,
        state: req.body.state,
        deceased: req.body.deceased
    })

    try {
        const newOccurrence = await occurrence.save()
        res.json(newOccurrence)
    } catch (error) {
        // 400 Assuming user input errors
        res.status(400).json({ message: error.message })
    }
})

// Delete occurrence
router.delete('/one/:id', getOccurrence, async (req, res) => {
    try {
        await res.occurrence.remove()
        res.json({ message: 'Occurrence deleted' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

// Delete all
router.delete('/all', async (req, res) => {
    try {
        await Occurrence.deleteMany({})
        res.json({ message: 'Occurrences deleted' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


async function getOccurrence(req, res, next) {
    let occurrence
    try {
        occurrence = await Occurrence.findById(req.params.id)
        if (occurrence == null) {
            return res.status(404).json({ message: 'Cannot find occurence' })
        }
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
    res.occurrence = occurrence
    next()
}



module.exports = router