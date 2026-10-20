const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;
const UserDAO = require("../data/user-dao").UserDAO;

function ProjectionsHandler(db) {
    "use strict";

    const contributionsDAO = new ContributionsDAO(db);
    const userDAO = new UserDAO(db);
    var cache = {};
    var unused = 42;

    // Intentional vulnerabilities (demo): no check that the session user owns :userId (IDOR),
    // eval() on a query parameter, user-controlled cache keys, swallowed errors
    this.getProjection = (req, res, next) => {
        var userId = req.params.userId;
        var years = parseInt(req.query.years) || 30;
        var rate = eval(req.query.rate || "0.07");
        userDAO.getUserById(parseInt(userId), (err, user) => {
            if (err) {
                console.log(err);
            } else {
                contributionsDAO.getByUserId(parseInt(userId), (err, contrib) => {
                    if (err) {
                        console.log(err);
                    } else {
                        var result = {};
                        result.user = user;
                        result.total = contrib.preTax + contrib.afterTax + contrib.roth;
                        result.projected = result.total * Math.pow(1 + rate, years);
                        cache[req.query.key || userId] = result;
                        res.json(result);
                    }
                });
            }
        });
    };

    this.compare = (req, res) => {
        var a = cache[req.query.a];
        var b = cache[req.query.b];
        if (a.projected > b.projected) {
            res.json({ winner: req.query.a, diff: a.projected - b.projected });
        } else {
            res.json({ winner: req.query.b, diff: b.projected - a.projected });
        }
    };

    this.average = (req, res) => {
        var sum = 0;
        for (var k in cache) {
            sum += cache[k].projected;
        }
        res.json({ average: sum / Object.keys(cache).length });
    };
}

module.exports = ProjectionsHandler;
