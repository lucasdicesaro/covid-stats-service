const express = require("express");
const router = express.Router();
const Occurrence = require("../models/occurrence");
const Batch = require("../models/batch");
const fs = require("fs");
const csv = require('csv-parser');
const path = require("path");

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
    const batch = await Batch.find({}).sort({_id:-1}).limit(1)
    res.json(batch)
});


router.post("/update", (req, res) => {

    // TODO Replace this mock file with downloaded file from salud.gov.ar 
    const csvfile = path.resolve(__dirname, "../Random5Covid19Casos.csv");

    // TODO First time, truncate last 1000 occurences.
    // TODO Retrieve last Batch and get lastEventId value, in order to use it to filter news

    let currentLastEventId
    let currentDeltaSize = 0

    fs.createReadStream(csvfile)
        .on('error', () => {
            // handle error
            console.error(error.message)
        })
        .pipe(csv())
        .on('data', (row) => {
            //console.log(row);
            saveOccurence(row)

            // Save last processed EventId
            currentLastEventId=row[EVENT_ID]
            // Count processed records
            currentDeltaSize++;
        })
        .on('end', () => {
            // handle end of CSV
            console.log("End of csv file import. Creating news summary...");
            saveBatch(currentLastEventId, currentDeltaSize)
        })

    res.json({ message: "Data imported successfully." });
});



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
