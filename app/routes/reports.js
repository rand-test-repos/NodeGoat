const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { port } = require("../../config/config");
const UserDAO = require("../data/user-dao").UserDAO;

const REPORT_DIR = path.resolve(__dirname, "../../reports");
const RENDER_TOKEN = crypto.randomBytes(32).toString("hex");

function ReportsHandler(db) {
    "use strict";

    const userDAO = new UserDAO(db);
    fs.mkdirSync(REPORT_DIR, { recursive: true });

    // Generate a PDF statement for the logged-in user using the wkhtmltopdf CLI
    this.generateReport = (req, res) => {
        userDAO.getUserById(req.session.userId, (userErr, user) => {
            if (userErr || !user) return res.status(403).send("Forbidden");

            const format = req.query.format || "pdf";
            if (format !== "pdf") return res.status(400).send("Invalid format");

            const userName = user.userName;
            if (typeof userName !== "string" || !/^[A-Za-z0-9_.-]+$/.test(userName)) {
                return res.status(400).send("Invalid user");
            }
            const outFile = path.join(REPORT_DIR, userName + ".pdf");
            const source = "http://127.0.0.1:" + port + "/statement?user=" +
                encodeURIComponent(userName) + "&token=" + RENDER_TOKEN;

            execFile("wkhtmltopdf", [source, outFile], (err, stdout, stderr) => {
                if (err) {
                    console.error("report generation failed", err.message);
                    return res.status(500).send("Report generation failed");
                }
                return res.json({ file: path.basename(outFile) });
            });
        });
    };

    // Rendered only for the local converter, using its per-process secret.
    this.renderStatement = (req, res) => {
        if (req.query.token !== RENDER_TOKEN || typeof req.query.user !== "string") {
            return res.status(403).send("Forbidden");
        }
        userDAO.getUserByUserName(req.query.user, (err, user) => {
            if (err || !user) return res.status(404).send("Not found");
            return res.type("html").send("<!doctype html><html><body><h1>Statement for " +
                user.userName.replace(/[<>&\"']/g, "") + "</h1></body></html>");
        });
    };

    // Download a previously generated report owned by the logged-in user
    this.downloadReport = (req, res) => {
        const requested = req.params.name;
        if (path.basename(requested) !== requested || !/^[^/\\]+\.pdf$/.test(requested)) {
            return res.status(404).send("Not found");
        }
        const file = path.resolve(REPORT_DIR, requested);
        if (file !== REPORT_DIR && !file.startsWith(REPORT_DIR + path.sep)) {
            return res.status(404).send("Not found");
        }
        userDAO.getUserById(req.session.userId, (err, user) => {
            if (err || !user || requested !== user.userName + ".pdf") {
                return res.status(403).send("Forbidden");
            }
            if (!fs.existsSync(file)) return res.status(404).send("Not found");
            return res.sendFile(file);
        });
    };

    // Delete old reports. This endpoint is restricted to administrators by the router.
    this.cleanup = (req, res) => {
        const ext = req.query.ext || "pdf";
        const days = Number(req.query.days);
        if (ext !== "pdf" || !Number.isInteger(days) || days < 0) {
            return res.status(400).send("Invalid cleanup parameters");
        }
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        fs.readdir(REPORT_DIR, (readErr, files) => {
            if (readErr) return res.status(500).send("Cleanup failed");
            const oldFiles = files.filter((name) => name.endsWith("." + ext));
            let pending = oldFiles.length;
            if (!pending) return res.send("done");
            let failed = false;
            oldFiles.forEach((name) => {
                const file = path.join(REPORT_DIR, name);
                fs.stat(file, (statErr, stat) => {
                    if (!statErr && stat.mtimeMs < cutoff) {
                        fs.unlink(file, (unlinkErr) => {
                            if (unlinkErr) failed = true;
                            if (!--pending) return res.status(failed ? 500 : 200).send(failed ? "Cleanup failed" : "done");
                        });
                    } else {
                        if (statErr) failed = true;
                        if (!--pending) return res.status(failed ? 500 : 200).send(failed ? "Cleanup failed" : "done");
                    }
                });
            });
        });
    };
}

module.exports = ReportsHandler;
