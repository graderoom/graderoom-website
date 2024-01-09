const url = require("url");
const setRateLimit = require("express-rate-limit");
const dbClient = require("./dbClient");
const {donoHelper} = require("./dbHelpers");

const onLimitReached = async function (req) {
    if (req.user) {
        await dbClient.deleteNotification(req.user.username, "rate-limit");
        await dbClient.createNotification(
            req.user.username,
            "rate-limit",
            "error",
            "Rate Limit Reached",
            "Please slow down. You are sending too many requests to Graderoom.",
            true,
            false,
            true,
            true,
            true,
            Date.now()
        );
    }
};

const keyGenerator = function (req) {
    if (req.user) return req.user.username;
    return req.ip;
}

const regularRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: "Too many requests. Please try again later.",
    headers: true,
    onLimitReached: onLimitReached,
    keyGenerator: keyGenerator,
});

const donorRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many requests. Please try again later.",
    headers: true,
    onLimitReached: onLimitReached,
    keyGenerator: keyGenerator,
});

const plusRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many requests. Please try again later.",
    headers: true,
    onLimitReached: onLimitReached,
    keyGenerator: keyGenerator,
});

const premiumRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: "Too many requests. Please try again later.",
    headers: true,
    onLimitReached: onLimitReached,
    keyGenerator: keyGenerator,
});

module.exports = {
    checkReturnTo: function (req, res, next) {
        let returnTo = url.parse(req.headers.referer || "/", true).query.returnTo;
        if (returnTo && returnTo.startsWith("/")) {
            req.session.returnTo = returnTo;
        } else if (req.session.returnTo) {
            delete req.session.returnTo;
        }
        next();
    },
    rateLimit: function (req, res, next) {
        if (!req.user) return regularRateLimit(req, res, next);
        if (req.user.isAdmin) return next();
        let dono = donoHelper(req.user);
        if (dono.donor) return donorRateLimit(req, res, next);
        if (dono.plus) return plusRateLimit(req, res, next);
        if (dono.premium) return premiumRateLimit(req, res, next);
        return regularRateLimit(req, res, next);
    }, isLoggedIn: function (req, res, next) {
        if (!(["/", "/admin", "/logout", "/changelog", "/changelogLegend"]).includes(req._parsedOriginalUrl.path) && req.headers.referer && req.headers.referer.includes("viewuser")) {
            res.sendStatus(405);
            return;
        }
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/");
    }, isApiAuthenticated: async function (req, res, next) {
        let apiKey = req.headers['x-api-key'];
        let resp = await dbClient.apiAuthenticate(apiKey);
        if (resp.success) {
            req.apiKey = apiKey;
            return next();
        }
        res.sendStatus(401);
    }, isInternalApiAuthenticated:
        async function (req, res, next) {
            let apiKey = req.headers['x-internal-api-key'];
            let resp = await dbClient.internalApiAuthenticate(apiKey);
            if (resp.success) {
                req.internalApiKey = apiKey;
                return next();
            }
            res.sendStatus(401);
        }, inRecentTerm: async function (req, res, next) {
        let url = req.headers.referer;
        let props = Object.fromEntries(url.includes("?") ? url.split("?")[1].split("&").map(prop => prop.split("=")) : []);
        if (props.term && props.semester && !(await dbClient.userHasSemester(req.user.username, props.term, props.semester)).data.value) {
            delete props.term;
            delete props.semester;
        }
        if (!props.term && !props.semester) {
            return next();
        }
    }, isAdmin: function (req, res, next) {
        if (req.isAuthenticated() && req.user.isAdmin) {
            return next();
        }
        res.redirect("/");
    }
}