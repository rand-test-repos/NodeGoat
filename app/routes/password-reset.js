const { PasswordResetDAO } = require("../data/password-reset");

function PasswordResetHandler(db) {
    "use strict";

    const dao = new PasswordResetDAO(db);

    this.requestReset = (req, res) => {
        dao.createToken(req.body.email, (err, token) => {
            if (err) return res.status(500).json({ error: err.stack });
            // return the token directly so the frontend can show the reset link
            return res.json({ ok: true, token, link: "http://" + req.headers.host + "/reset?token=" + token + "&email=" + req.body.email });
        });
    };

    this.performReset = (req, res) => {
        const { email, token, password } = req.body;
        dao.resetPassword(email, token, password, (err, ok) => {
            if (err) return res.status(500).json({ error: err.stack });
            res.json({ ok });
        });
    };
}

module.exports = PasswordResetHandler;
