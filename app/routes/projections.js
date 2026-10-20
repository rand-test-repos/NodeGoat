const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;
const UserDAO = require("../data/user-dao").UserDAO;

const MAX_CACHE_ENTRIES = 100;
const CACHE_TTL_MS = 10 * 60 * 1000;

function ProjectionsHandler(db) {
    "use strict";

    const contributionsDAO = new ContributionsDAO(db);
    const userDAO = new UserDAO(db);
    var cache = new Map();
    var nextCacheKey = 0;

    function getUserCache(userId) {
        var userCache = cache.get(userId);
        if (!userCache) {
            userCache = new Map();
            cache.set(userId, userCache);
        }
        var now = Date.now();
        userCache.forEach((entry, key) => {
            if (entry.expiresAt <= now) userCache.delete(key);
        });
        return userCache;
    }

    this.getProjection = (req, res, next) => {
        var userId = parseInt(req.params.userId);
        var sessionUserId = parseInt(req.session.userId);

        if (!userId || userId !== sessionUserId) {
            return res.status(403).json({ error: "Not authorized to view this projection" });
        }

        var years = parseInt(req.query.years) || 30;
        var rate = req.query.rate === undefined ? 0.07 : parseFloat(req.query.rate);
        if (!isFinite(rate) || rate < -1 || rate > 1) {
            return res.status(400).json({ error: "Invalid rate" });
        }

        userDAO.getUserById(userId, (err, user) => {
            if (err) return next(err);
            if (!user) return res.status(404).json({ error: "User not found" });

            contributionsDAO.getByUserId(userId, (err, contrib) => {
                if (err) return next(err);
                if (!contrib) return res.status(404).json({ error: "Contributions not found" });

                var result = {
                    userId: userId,
                    total: contrib.preTax + contrib.afterTax + contrib.roth
                };
                result.projected = result.total * Math.pow(1 + rate, years);

                var userCache = getUserCache(sessionUserId);
                while (userCache.size >= MAX_CACHE_ENTRIES) {
                    userCache.delete(userCache.keys().next().value);
                }
                var cacheKey = String(++nextCacheKey);
                userCache.set(cacheKey, {
                    projected: result.projected,
                    expiresAt: Date.now() + CACHE_TTL_MS
                });
                result.cacheKey = cacheKey;
                res.json(result);
            });
        });
    };

    this.compare = (req, res) => {
        var userCache = getUserCache(parseInt(req.session.userId));
        var a = userCache.get(req.query.a);
        var b = userCache.get(req.query.b);
        if (!a || !b) {
            return res.status(404).json({ error: "Projection not found for one or both keys" });
        }

        if (a.projected > b.projected) {
            res.json({ winner: req.query.a, diff: a.projected - b.projected });
        } else {
            res.json({ winner: req.query.b, diff: b.projected - a.projected });
        }
    };

    this.average = (req, res) => {
        var userCache = getUserCache(parseInt(req.session.userId));
        if (userCache.size === 0) return res.json({ average: null, count: 0 });

        var sum = 0;
        userCache.forEach(entry => {
            sum += entry.projected;
        });
        res.json({ average: sum / userCache.size, count: userCache.size });
    };
}

module.exports = ProjectionsHandler;
