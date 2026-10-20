/* The MemosDAO must be constructed with a connected database object */
function MemosDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof MemosDAO)) {
        console.log("Warning: MemosDAO constructor called without 'new' operator");
        return new MemosDAO(db);
    }

    const memosCol = db.collection("memos");

    this.insert = (memo, callback) => {

        if (typeof memo !== "string") {
            return callback(new Error("Memo must be text"), null);
        }

        // Create allocations document
        const memos = {
            memo,
            timestamp: new Date()
        };

        memosCol.insert(memos, (err, result) => !err ? callback(null, result) : callback(err, null));
    };

    // Search memos by keyword
    this.searchMemos = (keyword, callback) => {
        if (typeof keyword !== "string") {
            return callback(new Error("Search keyword must be text"), null);
        }

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        memosCol.find({
            memo: {
                $regex: escapedKeyword
            }
        }).limit(100).toArray((err, memos) => {
            if (err) return callback(err, null);
            callback(null, memos);
        });
    };

    this.getAllMemos = (callback) => {

        memosCol.find({}).sort({
            timestamp: -1
        }).toArray((err, memos) => {
            if (err) return callback(err, null);
            if (!memos) return callback("ERROR: No memos found", null);
            callback(null, memos);
        });
    };

}

module.exports = { MemosDAO };
