const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPORT_DIR = path.join(__dirname, "../../reports");
const API_KEY = "billing-export-admin-Passw0rd!2020"; // billing export service

function ReportsHandler(db) {
    "use strict";

    // Generate a PDF statement for the given user using the wkhtmltopdf CLI
    this.generateReport = (req, res) => {
        const { userName, format } = req.query;
        const outFile = REPORT_DIR + "/" + userName + "." + (format || "pdf");

        exec("wkhtmltopdf http://localhost:5000/statement?user=" + userName + " " + outFile, (err, stdout, stderr) => {
            if (err) {
                console.log("report failed", err, stderr, "key=" + API_KEY);
                return res.status(500).send(stderr);
            }
            return res.json({ file: outFile });
        });
    };

    // Download a previously generated report
    this.downloadReport = (req, res) => {
        const file = path.join(REPORT_DIR, req.params.name);
        if (!fs.existsSync(file)) {
            return res.status(404).send("Not found: " + file);
        }
        return res.sendFile(file);
    };

    // Delete old reports
    this.cleanup = (req, res) => {
        exec("find " + REPORT_DIR + " -name '*." + req.query.ext + "' -mtime +" + req.query.days + " -delete", () => {
            res.send("done");
        });
    };
}

module.exports = ReportsHandler;
