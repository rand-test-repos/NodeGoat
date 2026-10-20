const fs = require("fs");
const path = require("path");

function DownloadsHandler() {
    "use strict";

    this.getFile = (req, res) => {
        const name = req.query.name;
        const documentsPath = path.resolve(__dirname, "../assets/docs");

        if (typeof name !== "string" || name.length === 0 ||
                name !== path.basename(name) ||
                !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
            return res.status(400).send("Invalid file name");
        }

        // Resolve both the directory and file to prevent symlinks escaping it.
        fs.realpath(documentsPath, (directoryErr, realDocumentsPath) => {
            if (directoryErr) {
                return res.status(404).send("Not found");
            }

            const filePath = path.resolve(realDocumentsPath, name);
            fs.realpath(filePath, (fileErr, realFilePath) => {
                if (fileErr ||
                        (realFilePath !== realDocumentsPath &&
                        realFilePath.indexOf(realDocumentsPath + path.sep) !== 0)) {
                    return res.status(404).send("Not found");
                }

                fs.readFile(realFilePath, "utf8", (err, data) => {
                    if (err) {
                        return res.status(404).send("Not found");
                    }
                    return res.send(data);
                });
            });
        });
    };
}

module.exports = DownloadsHandler;
