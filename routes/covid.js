const express = require('express')
const router = express.Router()
const Occurrence = require('../models/occurrence')


/* 
GET /covid/total
Parameters
- created_date - Date
- age - Int
- genre - String
- state - String
Response
- entity Occurrence
Error
- 404 Not found
*/
router.get('/total', async (req, res) => {
    //console.log('createdDate: ' + req.query.createdDate)
    //console.log('age: ' + req.query.age)
    //console.log('genre: ' + req.query.genre)
    //console.log('state: ' + req.query.state)
    // TODO Add all filters
    const occurrences = await Occurrence.findOne({ 'age': req.query.age }, function (err, filteredOccurrences) {
        if (err) return handleError(err)

        return filteredOccurrences
    })

    res.json(occurrences)
})

/*
GET /covid/deaths (filtrado por deceased=true)
Parameters
- created_date - Date
- age - Int
- genre - String
- state - String
Response
- entity Occurrence
Error
- 404 Not found
*/
router.get('/deaths', (req, res) => {
    res.json({ message: 'GET /deaths' })
})


// Find all occurrences
router.get('/', async (req, res) => {
    const occurrences = await Occurrence.find()
    res.json(occurrences)
})

// Create occurrence
router.post('/', async (req, res) => {

    const occurrence = new Occurrence({
        eventId: req.body.eventId,
        createdDate: req.body.createdDate,
        age: req.body.age,
        genre: req.body.genre,
        state: req.body.state,
        deceased: req.body.deceased
    })

    try {
        const newOccurrence = await occurrence.save()
        res.json(newOccurrence)
    } catch (error) {
        // TODO double check error code
        res.status(500).json({ message: error.message})
    }
})

// Delete occurrence
router.delete('/:id', getOccurrence, async (req, res) => {
    try {
        await res.occurrence.remove()
        res.json({ message: 'Occurrence deleted'})
    } catch (error) {
        res.status(500).json({ message: error.message})
    }
})

async function getOccurrence(req, res, next) {
    let occurrence
    try {
        occurrence = await Occurrence.findById(req.params.id)
        if (occurrence == null) {
            res.status(404).json({ message: 'Cannot find occurence' })
        }
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
    res.occurrence = occurrence
    next()
}






/*
GET /covid/update
Parameters
  N/A
Response
- execution_date
- delta_size
Error
- 404 Not found
*/
router.get('/update', (req, res) => {
    res.json({ message: 'GET /update' })
})

/*
POST /covid/update
Parameters
  N/A
Response
- "Processing..."
Error
- 500 Server error with error message
*/
router.post('/update', (req, res) => {
    res.json({ message: 'POST /update' })
})



module.exports = router