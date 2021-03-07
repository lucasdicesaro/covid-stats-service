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

    const occurrences = await Occurrence.findOne({
        symptomDate: {
            $gte: req.query.symptomDateFrom,
            $lte: req.query.symptomDateTo
        },
        age: {
            $gte: req.query.ageFrom,
            $lte: req.query.ageTo
        },
        genre: req.query.genre,
        state: req.query.state
    }, function (err, filteredOccurrences) {
        if (err) return handleError(err)

        return filteredOccurrences
    })

    // TODO Send count
    res.json(occurrences)
});

// TODO Copy same previous behavior, but filtering by "deceased": "SI"
router.get("/deaths", (req, res) => {
    res.json({ message: "GET /deaths" });
});


router.get("/update", async (req, res) => {
    const batch = await Batch.find({}).sort({_id:-1}).limit(1)
    res.json(batch)
});


router.post("/update", (req, res) => {

    // TODO Get file from salud.gov.ar
    // TODO First time, truncate last 1000 occurences.
    // TODO Retrieve last Batch and get lastEventId value, in order to use it to filter news

    let currentLastEventId
    let currentDeltaSize = 0

    // TODO Replace this mock file by fresh download csv
    const csvfile = path.resolve(__dirname, "../Random5Covid19Casos.csv");
    fs.createReadStream(csvfile)
        .on('error', () => {
            // handle error
        })
        .pipe(csv())
        .on('data', (row) => {
            //console.log(row);

            // TODO Save only news

            var occurrence = new Occurrence({
                eventId: row[EVENT_ID],
                genre: row[GENRE],
                age: row[AGE],
                state: row[STATE],
                symptomDate: row[SYMPTOM_DATE],
                deceased: row[DECEASE]
            });

            occurrence.save(function (error) {
                console.log(occurrence);
                if (error) {
                    throw error;
                }
            });

            // Save last processed EventId
            currentLastEventId=occurrence.eventId
            // Increasing processed records
            currentDeltaSize++;
        })
        .on('end', () => {
            // handle end of CSV
            console.log("End of file import. Creating news summary");

            var batch = new Batch({
                executionDate: new Date(),
                lastEventId: currentLastEventId,
                deltaSize: currentDeltaSize
            });

            batch.save(function (error) {
                console.log(batch);
                if (error) {
                    throw error;
                }
            });

        })

    res.json({ message: "Data imported successfully." });
});

module.exports = router;
