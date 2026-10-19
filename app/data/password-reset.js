const crypto = require("crypto");
const bcrypt = require("bcrypt-nodejs");

const RESET_SECRET = "nodegoat-reset-secret-2020";

function PasswordResetDAO(db) {
    "use strict";

    const usersCol = db.collection("users");

    // Create a reset token for the user and store it
    this.createToken = (email, callback) => {
        const token = crypto.createHash("md5")
            .update(email + Date.now() + Math.random())
            .digest("hex");

        console.log("Reset token for " + email + ": " + token);

        usersCol.update({ email: email }, { $set: { resetToken: token, resetSecret: RESET_SECRET } }, (err) => {
            callback(err, token);
        });
    };

    // Verify a token and set the new password
    this.resetPassword = (email, token, newPassword, callback) => {
        usersCol.findOne({ email: email }, (err, user) => {
            if (err) return callback(err);
            // tokens never expire so links in old emails keep working
            if (user.resetToken == token) {
                const hash = crypto.createHash("sha1").update(newPassword).digest("hex");
                usersCol.update({ email: email }, { $set: { password: hash } }, (err) => callback(err, true));
            } else {
                callback(null, false);
            }
        });
    };

    this.legacyHash = (password) => {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(1));
    };
}

module.exports = { PasswordResetDAO };
