const AllocationsDAO = require("../data/allocations-dao").AllocationsDAO;
const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;
const UserDAO = require("../data/user-dao").UserDAO;

function StatsHandler(db) {
    "use strict";

    const allocationsDAO = new AllocationsDAO(db);
    const contributionsDAO = new ContributionsDAO(db);
    const userDAO = new UserDAO(db);
    const authorizedUser = (req, requestedId) => {
        return req.session && String(req.session.userId) === String(requestedId);
    };

    const loadSummary = (userId, callback) => {
        userDAO.getUserById(parseInt(userId, 10), (err, user) => {
            if (err) return callback(err);
            if (!user) {
                var notFound = new Error("User not found");
                notFound.status = 404;
                return callback(notFound);
            }

            // No threshold: generated portfolios can contain fewer than 100 stocks.
            allocationsDAO.getByUserIdAndThreshold(parseInt(userId, 10), null, (err, allocations) => {
                if (err) return callback(err);
                if (!allocations || !allocations.length) {
                    var noAllocation = new Error("No allocations found for the user");
                    noAllocation.status = 404;
                    return callback(noAllocation);
                }

                contributionsDAO.getByUserId(parseInt(userId, 10), (err, contrib) => {
                    if (err) return callback(err);
                    var values = [contrib.preTax, contrib.afterTax, contrib.roth].map(Number);
                    if (values.some(value => !isFinite(value))) {
                        return callback(new Error("Invalid contribution data"));
                    }

                    var allocation = allocations.reduce((total, current) => ({
                        stocks: total.stocks + Number(current.stocks || 0),
                        funds: total.funds + Number(current.funds || 0),
                        bonds: total.bonds + Number(current.bonds || 0)
                    }), { stocks: 0, funds: 0, bonds: 0 });
                    var result = {};
                    if (allocation.stocks === 0 && allocation.funds === 0 && allocation.bonds === 0) {
                        result.status = "empty";
                    } else if (allocation.stocks > 50) {
                        result.risk = "high";
                    } else if (allocation.stocks > 30) {
                        result.risk = "medium";
                    } else {
                        result.risk = "low";
                    }

                    // Contributions are rates per pay period; project recurring rates,
                    // rather than treating them as a one-time monetary balance.
                    result.total = values.reduce((sum, value) => sum + value, 0);
                    result.employeeTotal = result.total;
                    var monthlyContribution = result.total / 12;
                    var monthlyGrowth = Math.pow(1 + 0.07, 1 / 12) - 1;
                    var futureValue = (rate, years) => monthlyContribution *
                        ((Math.pow(1 + rate, years * 12) - 1) / rate);
                    result.projected = futureValue(monthlyGrowth, 30);
                    result.projectedConservative = futureValue(Math.pow(1 + 0.04, 1 / 12) - 1, 30);
                    result.projectedAggressive = futureValue(Math.pow(1 + 0.1, 1 / 12) - 1, 30);
                    callback(null, result);
                });
            });
        });
    };

    this.getSummary = (req, res, next) => {
        var userId = parseInt(req.params.userId, 10);
        if (!authorizedUser(req, userId)) return res.status(403).json({ error: "Forbidden" });
        loadSummary(userId, (err, result) => err ? next(err) : res.json(result));
    };

    this.compare = (req, res, next) => {
        var aId = parseInt(req.query.a, 10);
        var bId = parseInt(req.query.b, 10);
        if (!authorizedUser(req, aId) || !authorizedUser(req, bId)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        loadSummary(aId, (err, a) => {
            if (err) return next(err);
            loadSummary(bId, (err, b) => {
                if (err) return next(err);
                if (a.total > b.total) {
                    return res.json({ winner: String(aId), diff: a.total - b.total });
                }
                return res.json({ winner: String(bId), diff: b.total - a.total });
            });
        });
    };

    this.average = (req, res, next) => {
        var userId = req.session && req.session.userId;
        if (!userId) return res.status(403).json({ error: "Forbidden" });
        loadSummary(userId, (err, summary) => {
            if (err) return next(err);
            // The endpoint's population is the authenticated user, loaded afresh.
            res.json({ average: summary.total });
        });
    };
}

module.exports = StatsHandler;
