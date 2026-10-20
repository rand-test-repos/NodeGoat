/* global BigInt */
const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;
const {
    environmentalScripts
} = require("../../config/config");

// Accepts a plain number or a simple sum/difference of numbers, e.g. "10+2.5" or "15-3"
function parseContributionValue(input) {
    if (typeof input !== "string") return Number.NaN;

    // Whitespace is allowed around terms and operators, but not within a term.
    const numberPattern = "(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
    const expressionPattern = new RegExp("^\\s*[+-]?" + numberPattern +
        "(?:\\s*[+-]\\s*" + numberPattern + ")*\\s*$");
    if (!expressionPattern.test(input)) return Number.NaN;

    const normalized = input.trim().replace(/\s+/g, "");
    const terms = normalized.match(new RegExp("[+-]?" + numberPattern, "g"));
    const parsedTerms = terms.map(term => {
        const sign = term[0] === "-" ? -1 : 1;
        const unsignedTerm = term[0] === "+" || term[0] === "-" ? term.slice(1) : term;
        const parts = unsignedTerm.split(/[eE]/);
        const mantissa = parts[0];
        const exponent = parts.length === 2 ? Number(parts[1]) : 0;
        if (!Number.isSafeInteger(exponent)) return { invalid: true };

        // Remove insignificant zeros before determining the scale. This keeps
        // valid values such as 10.000000000000000 from creating huge integers.
        const mantissaParts = mantissa.split(".");
        const fractionalPart = (mantissaParts[1] || "").replace(/0+$/, "");
        const digits = mantissaParts[0] + fractionalPart;
        const decimalPlaces = fractionalPart.length;
        const scale = decimalPlaces - exponent;
        if (!Number.isSafeInteger(scale)) return { invalid: true };

        let coefficient = BigInt(digits) * BigInt(sign);
        if (scale < 0) {
            coefficient *= BigInt(10) ** BigInt(-scale);
        }
        return { coefficient, scale: Math.max(scale, 0) };
    });

    if (parsedTerms.some(term => term.invalid)) return Number.NaN;

    const scale = parsedTerms.reduce((maximum, term) => Math.max(maximum, term.scale), 0);
    const scaledSum = parsedTerms.reduce((sum, term) => {
        return sum + term.coefficient * BigInt(10) ** BigInt(scale - term.scale);
    }, BigInt(0));

    // Keep the arithmetic exact, and only convert once the result is known to
    // fit in the range accepted by the original validation.
    const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);
    if (scaledSum < -maxSafeInteger || scaledSum > maxSafeInteger) return Number.NaN;
    const result = Number(scaledSum) / Math.pow(10, scale);
    return Number.isFinite(result) ? result : Number.NaN;
}

/* The ContributionsHandler must be constructed with a connected db */
function ContributionsHandler(db) {
    "use strict";

    const contributionsDAO = new ContributionsDAO(db);

    this.displayContributions = (req, res, next) => {
        const {
            userId
        } = req.session;

        contributionsDAO.getByUserId(userId, (error, contrib) => {
            if (error) return next(error);

            contrib.userId = userId; //set for nav menu items
            return res.render("contributions", {
                ...contrib,
                environmentalScripts
            });
        });
    };

    this.handleContributionsUpdate = (req, res, next) => {


        const preTax = parseContributionValue(req.body.preTax);
        const afterTax = parseContributionValue(req.body.afterTax);
        const roth = parseContributionValue(req.body.roth);

        const {
            userId
        } = req.session;

        //validate contributions
        const validations = [isNaN(preTax), isNaN(afterTax), isNaN(roth), preTax < 0, afterTax < 0, roth < 0];
        const isInvalid = validations.some(validation => validation);
        if (isInvalid) {
            return res.render("contributions", {
                updateError: "Invalid contribution percentages",
                userId,
                environmentalScripts
            });
        }
        // Prevent more than 30% contributions
        if (preTax + afterTax + roth > 30) {
            return res.render("contributions", {
                updateError: "Contribution percentages cannot exceed 30 %",
                userId,
                environmentalScripts
            });
        }

        contributionsDAO.update(userId, preTax, afterTax, roth, (err, contributions) => {

            if (err) return next(err);

            contributions.updateSuccess = true;
            return res.render("contributions", {
                ...contributions,
                environmentalScripts
            });
        });

    };

}

module.exports = ContributionsHandler;
