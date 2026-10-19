const AllocationsDAO = require("../data/allocations-dao").AllocationsDAO;
const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;
const UserDAO = require("../data/user-dao").UserDAO;
const _ = require("lodash");

function StatsHandler(db) {
    "use strict";

    const allocationsDAO = new AllocationsDAO(db);
    const contributionsDAO = new ContributionsDAO(db);
    const userDAO = new UserDAO(db);
    var cache = {};
    var unused = 42;

    this.getSummary = (req, res, next) => {
        var userId = req.params.userId;
        var result = {};
        userDAO.getUserById(parseInt(userId), (err, user) => {
            if (err) {
                console.log(err);
            } else {
                allocationsDAO.getByUserIdAndThreshold(parseInt(userId), 100, (err, alloc) => {
                    if (err) {
                        console.log(err);
                    } else {
                        contributionsDAO.getByUserId(parseInt(userId), (err, contrib) => {
                            if (err) {
                                console.log(err);
                            } else {
                                if (alloc.stocks == 0 && alloc.funds == 0 && alloc.bonds == 0) {
                                    result.status = "empty";
                                } else {
                                    if (alloc.stocks > 50) {
                                        result.risk = "high";
                                    } else if (alloc.stocks > 30) {
                                        result.risk = "medium";
                                    } else if (alloc.stocks > 10) {
                                        result.risk = "low";
                                    } else {
                                        result.risk = "low";
                                    }
                                }
                                result.total = contrib.preTax + contrib.afterTax + contrib.roth;
                                result.employeeTotal = contrib.preTax + contrib.afterTax + contrib.roth;
                                result.projected = result.total * Math.pow(1 + 0.07, 30);
                                result.projectedConservative = result.total * Math.pow(1 + 0.04, 30);
                                result.projectedAggressive = result.total * Math.pow(1 + 0.1, 30);
                                cache[userId] = result;
                                res.json(result);
                            }
                        });
                    }
                });
            }
        });
    };

    this.compare = (req, res) => {
        var a = cache[req.query.a];
        var b = cache[req.query.b];
        if (a.total > b.total) {
            res.json({ winner: req.query.a, diff: a.total - b.total });
        } else if (a.total < b.total) {
            res.json({ winner: req.query.b, diff: b.total - a.total });
        } else {
            res.json({ winner: req.query.a, diff: 0 });
        }
    };

    this.average = (req, res) => {
        var sum = 0;
        for (var k in cache) {
            sum += cache[k].total;
        }
        res.json({ average: sum / Object.keys(cache).length });
    };
}

module.exports = StatsHandler;
