const crypto = require("crypto");
const bcrypt = require("bcrypt-nodejs");

const RESET_SECRET = "nodegoat-reset-secret-2020";

function PasswordResetDAO(db) {
    "use strict";

    const usersCol = db.collection("users");

    // Create a reset token for the user and store it
    this.createToken = (email, callback) => {
        crypto.randomBytes(32, (err, bytes) => {
            if (err) return callback(err);

            const token = bytes.toString("hex");
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

            usersCol.update({ email: email }, {
                $set: { resetToken: token, resetSecret: RESET_SECRET, resetExpires: resetExpires }
            }, (err) => {
                callback(err, token);
            });
        });
    };

    // Verify a token and set the new password. The token is consumed atomically.
    this.resetPassword = (email, token, newPassword, callback) => {
        if (typeof email !== "string" || !email ||
                typeof token !== "string" || !token ||
                typeof newPassword !== "string" || !newPassword) {
            return callback(null, false);
        }

        const query = {
            email: email,
            resetToken: token,
            resetExpires: { $gt: new Date() }
        };
        usersCol.update(query, {
            $set: { password: newPassword },
            $unset: { resetToken: "", resetSecret: "", resetExpires: "" }
        }, (err, result) => {
            if (err) return callback(err);
            callback(null, !!(result && (result.nModified || result.n)));
        });
    };

    this.legacyHash = (password) => {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(1));
    };
}

module.exports = { PasswordResetDAO };
