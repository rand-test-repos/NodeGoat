const { exec } = require("child_process");

function DiagnosticsHandler() {
    "use strict";

    // Intentional vulnerability (demo): OS command injection via user-controlled host
    this.ping = (req, res) => {
        const host = req.query.host;
        exec("ping -c 1 " + host, (err, stdout, stderr) => {
            res.send("<pre>" + stdout + stderr + "</pre>");
        });
    };
}

module.exports = DiagnosticsHandler;
