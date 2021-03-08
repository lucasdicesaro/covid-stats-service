const express = require("express");
const router = express.Router();
const Occurrence = require("../models/occurrence");
const Batch = require("../models/batch");
const fs = require("fs");
const https = require('https');
const csv = require('csv-parser');
const path = require("path");
const firstline = require('firstline');
const readLastLine = require('read-last-line');
const stringSanitizer = require("string-sanitizer");


const EVENT_ID = "id_evento_caso"
const GENRE = "sexo"
const AGE = "edad"
const STATE = "residencia_provincia_nombre"
const SYMPTOM_DATE = "fecha_inicio_sintomas"
const DECEASE = "fallecido"


router.get("/total", async (req, res) => {

    var query = Occurrence.find();

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
    var query = Occurrence.find();

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

    // TODO Remove this line and uncomment next block
    const csvfileAllCases = path.resolve(__dirname, "../tmp/Last50Covid19Casos.csv")

    // Downdloads and saves a local copy
    //const csvfileAllCases = path.resolve(__dirname, "../tmp/Covid19Casos.csv");
    // TODO Uncomment to download remote csv. Try it with await
    //const request = https.get("https://sisa.msal.gov.ar/datos/descargas/covid-19/files/Covid19Casos.csv", function(response) {
    //    console.log('Downloading csv file...')
    //    response.pipe(fs.createWriteStream(csvfileAllCases))
    //})

    const csvfileLastCases = path.resolve(__dirname, "../tmp/LastCovid19Casos.csv")

    // CSV Headers
    const csvHeaders = await firstline(csvfileAllCases)
    //console.log(csvHeaders);
    await fs.writeFile(csvfileLastCases, csvHeaders, 'utf8', (err) => {
        if (err) throw err
        console.log('Header saved!')
    });

    // Truncates last N lines.
    const lastNlines = 20
    // TODO This is breaking file encoding. Change this solution
    const lines = await readLastLine.read(csvfileAllCases, lastNlines).then(function (lines) {
        return lines
    }).catch(function (err) {
        console.log(err.message)
    });
    //console.log(lines)
    await fs.appendFile(csvfileLastCases, lines, 'utf8', (err) => {
        if (err) throw err

        console.log('Last-occurences-file saved!')
    });

    // Find is a previous Batch exists
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

    // Saves only news to database
    fs.createReadStream(csvfileLastCases)
        .on('error', () => {
            console.error(error.message)
        })
        .pipe(csv())
        .on('data', (row) => {
            //console.log(row);
            const currentEventId = stringSanitizer.sanitize(row[EVENT_ID])
            row[EVENT_ID] = currentEventId

            if (currentEventId == '') return; // Ignoring empty rows...

            // Check only greater eventId's
            if (previousLastEventId == null || currentEventId > previousLastEventId) {
                console.log('EventId: ' + currentEventId + ' not processed yet. Inserting row...')
                saveOccurence(row)

                // Save last processed EventId
                currentLastEventId=currentEventId
                // Count processed records
                currentDeltaSize++
            } else {
                console.log('EventId: [' + currentEventId + '] already processed. previousLastEventId: ' + previousLastEventId + '. Ignoring row...')
            }
        })
        .on('end', () => {
            // Only if there are news...
            if (currentDeltaSize > 0) {
                console.log("End of csv file import. Creating branch execution summary...")
                saveBatch(currentLastEventId, currentDeltaSize)
            } else {
                console.log("End of csv file import. No news")
            }
        })

    res.json({ message: "Data imported successfully." })
});


async function findLastBatch () {
    const batch = await Batch.findOne({}).sort({_id:-1}).limit(1)
    return batch
}


async function saveOccurence (row) {
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
        console.log('Occurrence saved successfully: ' + occurrence);
    });
}


async function saveBatch (currentLastEventId, currentDeltaSize) {
    var batch = new Batch({
        executionDate: new Date(),
        lastEventId: currentLastEventId,
        deltaSize: currentDeltaSize
    });

    await batch.save(function (error) {
        if (error) {
            throw error;
        }
        console.log('Batch saved successfully: ' + batch);
    });
}


module.exports = router;
