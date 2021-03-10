const express = require("express");
const router = express.Router();
const Occurrence = require("../models/occurrence");
const Batch = require("../models/batch");
const fs = require("fs");
const https = require('https');
const csv = require('csv-parser');
const path = require("path");
const firstline = require('firstline');
const readLastLines = require('read-last-lines');
const stringSanitizer = require("string-sanitizer");
const { promisify } = require('util')

const EVENT_ID = "id_evento_caso"
const GENRE = "sexo"
const AGE = "edad"
const STATE = "residencia_provincia_nombre"
const SYMPTOM_DATE = "fecha_inicio_sintomas"
const DECEASE = "fallecido"

const writeFileAsync = promisify(fs.writeFile)
const appendFileAsync = promisify(fs.appendFile)

router.get("/total", async (req, res) => {
    try {
        const count = await countOccurrences(req)
        res.json(count)
    } catch (err) {
        console.log(error.message)
        res.status(500).json({ message: err.message })
    }
})

router.get("/deaths", async (req, res) => {
    try {
        const deceased = 'SI'
        const count = await countOccurrences(req, deceased)
        res.json(count)
    } catch (err) {
        console.log(error.message)
        res.status(500).json({ message: err.message })
    }
})

router.get("/update", async (req, res) => {
    try {
        const batch = await findLastBatch()
        res.json(batch)
    } catch (err) {
        console.log(error.message)
        res.status(500).json({ message: err.message })
    }
});


router.post("/update", async (req, res) => {
    (async () => {
        await initBatchUpdate();
    })();

    let date = new Date()
    let offset = date.getTimezoneOffset()
    date = new Date(date.getTime() - (offset * 60 * 1000))

    res.json({ message: "Batch update started at " + date.toISOString() + "..." })
});



async function initBatchUpdate() {

    try {
        const lastNlines = 1000
        // Retrieve and generate last cases
        const csvFileLastCases = await getCsvFileLastCases(lastNlines)

        // Check if a previous Batch already exists
        const batch = await findLastBatch()
        let previousLastEventId = null
        if (batch != null) {
            previousLastEventId = batch.lastEventId
            console.log('Previous batch execution found - previousLastEventId: ' + previousLastEventId)
        } else {
            console.log('Batch execution not found. First execution')
        }

        let currentLastEventId
        let currentDeltaSize = 0
        let ignoredRows = 0

        // Saves only news to database
        fs.createReadStream(csvFileLastCases)
            .on('error', (err) => {
                console.error(err.message)
                throw err
            })
            .pipe(csv())
            .on('data', (row) => {

                // Fixes Mongoose Nan validation on perstist. Error message:
                // 'CastError: Cast to Number failed for value "\n"999975"" at path "eventId"'
                row[EVENT_ID] = stringSanitizer.sanitize(row[EVENT_ID])
                const currentEventId = row[EVENT_ID]

                if (currentEventId == '') return; // Ignoring empty rows...

                // Processing only greater eventId's values
                if (previousLastEventId == null || currentEventId > previousLastEventId) {
                    console.log('EventId: [' + currentEventId + '] not processed yet. Inserting row...')

                    // Persist Occurrence
                    saveOccurence(row)

                    // Keep last EventId
                    currentLastEventId = currentEventId
                    // Count processed records
                    currentDeltaSize++
                } else {
                    //console.log('EventId: [' + currentEventId + '] already processed. previousLastEventId: [' + previousLastEventId + ']. Ignoring row...')
                    ignoredRows++
                }
            })
            .on('end', () => {
                console.log('Ignored (previously processed) rows: ' + ignoredRows)

                if (currentDeltaSize > 0) { // Only if there are news...
                    console.log("End of csv file import. Creating Batch execution summary...")

                    saveBatch(currentLastEventId, currentDeltaSize)
                } else {
                    console.log("End of csv file import. No news")
                }
            })

    } catch (err) {
        console.log('Error while executing Batch update: ' + err.message)
        throw err
    }
}



async function getCsvFileLastCases(lastNlines) {

    const allCasesFileName = '../tmp/Covid19Casos.csv'
    const lastCasesFileName = '../tmp/LastCovid19Casos.csv'
    const remoteCSVFileUrl = 'https://sisa.msal.gov.ar/datos/descargas/covid-19/files/Covid19Casos.csv'

    try {
        // Downdloads and saves a local copy
        const csvFileAllCases = path.resolve(__dirname, allCasesFileName);
        console.log('Downloading CSV file...')
        await getCSVFile(remoteCSVFileUrl, csvFileAllCases)

        // CSV Headers
        console.log('Building CSV file...')
        const csvFileLastCases = path.resolve(__dirname, lastCasesFileName)
        const csvHeaders = await firstline(csvFileAllCases)
        await writeFileAsync(csvFileLastCases, csvHeaders)
        console.log('CSV header saved!')

        // CSV Body - Creating a new file with last N updates
        console.log('Generating CSV body with last ' + lastNlines + ' occurrences...')
        const csvBodyLines = await readLastLines.read(csvFileAllCases, lastNlines)
        await appendFileAsync(csvFileLastCases, csvBodyLines)
        console.log('CSV body saved!')

        return csvFileLastCases
    } catch (err) {
        console.log('Error while proceesing new CSV file: ' + err.message)
        throw err
    }
}

async function getCSVFile(url, destFileName) {

    return new Promise((resolve) => {
        https.get(url, function (response) {
            response.pipe(fs.createWriteStream(destFileName))
            response.on('end', () => {
                resolve('Done')
            })
            response.on('error', (err) => {
                reject('Error')
            })
        })
    })
}


async function findLastBatch() {
    try {
        // Retrieves last generated Batch
        const batch = await Batch.findOne({}).sort({ _id: -1 }).limit(1)
        return batch
    } catch (err) {
        console.log('Error while retrieving last Batch execution: ' + err.message)
        throw err
    }
}


async function saveOccurence(row) {
    var occurrence = new Occurrence({
        eventId: row[EVENT_ID],
        genre: row[GENRE],
        age: row[AGE],
        state: row[STATE],
        symptomDate: row[SYMPTOM_DATE],
        deceased: row[DECEASE]
    });

    try {
        const newOccurrence = await occurrence.save()
        console.log('Occurrence saved successfully. EventId: ' + occurrence.eventId);
        return newOccurrence
    } catch (err) {
        console.log('Error occurred on Occurrence save: ' + err.message)
        throw err
    }
}


async function saveBatch(currentLastEventId, currentDeltaSize) {
    var batch = new Batch({
        executionDate: new Date(),
        lastEventId: currentLastEventId,
        deltaSize: currentDeltaSize
    });

    try {
        const newBatch = await batch.save()
        console.log('Batch saved successfully. LastEventId: ' + batch.lastEventId + ' - DeltaSize: ' + batch.deltaSize)
        return newBatch
    } catch (err) {
        console.log('Error occurred on Batch save: ' + err.message)
        throw err
    }
}


async function countOccurrences(req, deceased) {
    const query = Occurrence.countDocuments();

    if (req.query.symptomDateFrom != null) {
        query.where('symptomDate').gte(req.query.symptomDateFrom);
    }
    if (req.query.symptomDateTo != null) {
        query.where('symptomDate').lte(req.query.symptomDateTo);
    }
    if (req.query.ageFrom != null) {
        query.where('age').gte(req.query.ageFrom);
    }
    if (req.query.ageTo != null) {
        query.where('age').lte(req.query.ageTo);
    }
    if (req.query.genre != null) {
        query.where('genre').equals(req.query.genre);
    }
    if (req.query.state != null) {
        query.where('state').equals(req.query.state);
    }
    if (deceased) {
        query.where('deceased').equals(deceased);
    }

    try {
        const count = await query.exec()
        return count
    } catch (err) {
        console.log('Error occurred on Batch save: ' + err.message)
        throw err
    }
}


module.exports = router;
