const { PasswordResetDAO } = require("../data/password-reset");

function PasswordResetHandler(db) {
    "use strict";

    const dao = new PasswordResetDAO(db);

    const validEmail = (email) => {
        return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    this.requestReset = (req, res, next) => {
        const email = req.body && req.body.email;
        if (!validEmail(email)) return res.status(400).json({ error: "Invalid email address" });

        dao.createToken(email, (err) => {
            if (err) return next(err);
            // The reset link must be delivered through an account-owned channel.
            return res.json({ ok: true });
        });
    };

    this.performReset = (req, res, next) => {
        const { email, token, password } = req.body || {};
        if (!validEmail(email) || typeof token !== "string" || !token ||
                typeof password !== "string" || !password) {
            return res.status(400).json({ error: "Invalid reset request" });
        }

        dao.resetPassword(email, token, password, (err, ok) => {
            if (err) return next(err);
            res.json({ ok });
        });
    };

    this.displayResetPage = (req, res) => {
        const escapeHtml = (value) => value.replace(/[&<>\"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[character]));
        const email = escapeHtml(typeof req.query.email === "string" ? req.query.email : "");
        const token = escapeHtml(typeof req.query.token === "string" ? req.query.token : "");
        return res.send("<!doctype html><html><body>" +
            "<form method=\"post\" action=\"/reset\">" +
            "<input type=\"hidden\" name=\"email\" value=\"" + email + "\">" +
            "<input type=\"hidden\" name=\"token\" value=\"" + token + "\">" +
            "<input type=\"password\" name=\"password\" required>" +
            "<button type=\"submit\">Reset password</button></form></body></html>");
    };
}

module.exports = PasswordResetHandler;
