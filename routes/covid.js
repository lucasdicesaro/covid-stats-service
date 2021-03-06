const express = require('express')
const router = express.Router()


/* 
GET /covid/total
Parameters
- created_date - Date
- age - Int
- genre - String
- state - String
Response
- entity Cases
Error
- 404 Not found
*/
router.get('/total', (req, res) => {
    res.json({ message: 'GET /total' })
})

/*
GET /covid/deaths (filtrado por deceased=true)
Parameters
- created_date - Date
- age - Int
- genre - String
- state - String
Response
- entity Cases
Error
- 404 Not found
*/
router.get('/deaths', (req, res) => {
    res.json({ message: 'GET /deaths' })
})


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