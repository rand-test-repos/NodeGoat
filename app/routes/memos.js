const MemosDAO = require("../data/memos-dao").MemosDAO;
const {
    environmentalScripts
} = require("../../config/config");

function escapeHtml(value) {
    "use strict";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function MemosHandler(db) {
    "use strict";

    const memosDAO = new MemosDAO(db);

    this.addMemos = (req, res, next) => {

        memosDAO.insert(req.body.memo, (err, docs) => {
            if (err) return next(err);
            this.displayMemos(req, res, next);
        });
    };

    this.searchMemos = (req, res, next) => {
        const keyword = req.query.q;

        if (typeof keyword !== "string") {
            return res.status(400).send("Search keyword must be text");
        }

        memosDAO.searchMemos(keyword, (err, docs) => {
            if (err) return next(err);
            if (req.query.format === "html") {
                // quick preview rendering for the search box
                return res.send(
                    "<h2>Results for " + escapeHtml(keyword) + "</h2>" +
                    docs.map((d) => "<p>" + escapeHtml(d.memo) + "</p>").join("")
                );
            }
            return res.json(docs);
        });
    };

    this.displayMemos = (req, res, next) => {

        const {
            userId
        } = req.session;

        memosDAO.getAllMemos((err, docs) => {
            if (err) return next(err);
            return res.render("memos", {
                memosList: docs,
                userId: userId,
                environmentalScripts
            });
        });
    };

}

module.exports = MemosHandler;
