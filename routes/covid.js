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


const EVENT_ID = "id_evento_caso"
const GENRE = "sexo"
const AGE = "edad"
const STATE = "residencia_provincia_nombre"
const SYMPTOM_DATE = "fecha_inicio_sintomas"
const DECEASE = "fallecido"


router.get("/total", async (req, res) => {

    var query = Occurrence.countDocuments();

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

    await query.exec(function (err, count) {
        if (err) return handleError(err)

        // TODO Should I move this?
        res.json(count)
    })
});

router.get("/deaths", async (req, res) => {

    // TODO Refactor this duplicated block
    var query = Occurrence.countDocuments();

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
    query.where('deceased').equals('SI');

    await query.exec(function (err, count) {
        if (err) return handleError(err)

        // TODO Should I move this?
        res.json(count)
    })
});

router.get("/update", async (req, res) => {
    const batch = await findLastBatch()
    res.json(batch)
});


router.post("/update", async (req, res) => {

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
        })
        .pipe(csv())
        .on('data', async (row) => {

            // Fixes Mongoose Nan validation on perstist. Error message:
            // 'CastError: Cast to Number failed for value "\n"999975"" at path "eventId"'
            const currentEventId = stringSanitizer.sanitize(row[EVENT_ID])
            row[EVENT_ID] = currentEventId

            if (currentEventId == '') return; // Ignoring empty rows...

            // Processing only greater eventId's values
            if (previousLastEventId == null || currentEventId > previousLastEventId) {
                console.log('EventId: [' + currentEventId + '] not processed yet. Inserting row...')

                // Persist Occurrence
                await saveOccurence(row)

                // Keep last EventId
                currentLastEventId = currentEventId
                // Count processed records
                currentDeltaSize++
            } else {
                //console.log('EventId: [' + currentEventId + '] already processed. previousLastEventId: [' + previousLastEventId + ']. Ignoring row...')
                ignoredRows++
            }
        })
        .on('end', async () => {
            console.log('Ignored (previously processed) rows: ' + ignoredRows)

            if (currentDeltaSize > 0) { // Only if there are news...
                console.log("End of csv file import. Creating Batch execution summary...")

                await saveBatch(currentLastEventId, currentDeltaSize)
            } else {
                console.log("End of csv file import. No news")
            }
        })

    res.json({ message: "CSV imported successfully." })
});


async function getCsvFileLastCases(lastNlines) {

    // Downdloads and saves a local copy
    const csvFileAllCases = path.resolve(__dirname, "../tmp/Covid19Casos.csv");
    //await https.get("https://sisa.msal.gov.ar/datos/descargas/covid-19/files/Covid19Casos.csv", function(response) {
    //    console.log('Downloading csv file...')
    //    response.pipe(fs.createWriteStream(csvFileAllCases))
    //})

    const csvFileLastCases = path.resolve(__dirname, "../tmp/LastCovid19Casos.csv")

    console.log('Building CSV file with last ' + lastNlines + ' occurrences...')

    // CSV Headers
    const csvHeaders = await firstline(csvFileAllCases)
    await fs.writeFile(csvFileLastCases, csvHeaders, 'utf8', (err) => {
        if (err) throw err

        console.log('CSV header saved!')
    })

    // Filtering last N lines from CSV huge file.
    const csvBodyLines = await readLastLines.read(csvFileAllCases, lastNlines)
        .then(function (lines) {
            return lines
        }).catch(function (err) {
            console.log(err.message)
            throw err
        });

    // Creating a new file with last N updates
    await fs.appendFile(csvFileLastCases, csvBodyLines, 'utf8', (err) => {
        if (err) throw err

        console.log('CSV body saved!')
    });

    return csvFileLastCases
}


async function findLastBatch() {
    // Retrieves last generated Batch
    const batch = await Batch.findOne({}).sort({ _id: -1 }).limit(1)
    return batch
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

    occurrence.save(function (error) {
        if (error) {
            throw error;
        }
        console.log('Occurrence saved successfully. EventId: ' + occurrence.eventId);
    });
}


async function saveBatch(currentLastEventId, currentDeltaSize) {
    var batch = new Batch({
        executionDate: new Date(),
        lastEventId: currentLastEventId,
        deltaSize: currentDeltaSize
    });

    await batch.save(function (error) {
        if (error) {
            throw error;
        }
        console.log('Batch saved successfully. LastEventId: ' + batch.lastEventId + ' - DeltaSize: ' + batch.deltaSize);
    });
}


module.exports = router;
