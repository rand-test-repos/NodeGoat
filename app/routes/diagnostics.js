const net = require("net");
const { execFile } = require("child_process");

function DiagnosticsHandler() {
    "use strict";

    this.ping = (req, res) => {
        const host = req.query.host;
        const hostnameLabel = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        const hostnameParts = typeof host === "string" ? host.split(".") : [];
        const isHostname = typeof host === "string" && host.length <= 253 &&
            hostnameParts.every(label => hostnameLabel.test(label));
        if (typeof host !== "string" || (!net.isIP(host) && !isHostname)) {
            return res.status(400).send("Invalid host");
        }

        execFile("ping", ["-c", "1", host], { timeout: 5000 }, (err, stdout, stderr) => {
            if (err) {
                if (err.killed) {
                    return res.status(504).send("Ping timed out");
                }
                return res.status(502).send("Ping failed");
            }
            return res.send("<pre>" + stdout + stderr + "</pre>");
        });
    };
}

module.exports = DiagnosticsHandler;
