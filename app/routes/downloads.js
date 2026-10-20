const fs = require("fs");
const path = require("path");

function DownloadsHandler() {
    "use strict";

    // Intentional vulnerability (demo): path traversal via user-controlled filename
    this.getFile = (req, res) => {
        const filePath = path.join(__dirname, "../assets/docs", req.query.name);
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                return res.status(404).send("Not found");
            }
            return res.send(data);
        });
    };
}

module.exports = DownloadsHandler;
