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
    return req.headers['x-forwarded-for'] || req.ip;
}

const regularRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many requests. Please try again later.",
    headers: true,
    handler: async (req) => {
        if (req.rateLimit.used === req.rateLimit.limit + 1) {
            await onLimitReached(req);
        }
    },
    keyGenerator: keyGenerator,
});

const donorRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 40,
    message: "Too many requests. Please try again later.",
    headers: true,
    handler: async (req) => {
        if (req.rateLimit.used === req.rateLimit.limit + 1) {
            await onLimitReached(req);
        }
    },
    keyGenerator: keyGenerator,
});

const plusRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many requests. Please try again later.",
    headers: true,
    handler: async (req) => {
        if (req.rateLimit.used === req.rateLimit.limit + 1) {
            await onLimitReached(req);
        }
    },
    keyGenerator: keyGenerator,
});

const premiumRateLimit = setRateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: "Too many requests. Please try again later.",
    headers: true,
    handler: async (req) => {
        if (req.rateLimit.used === req.rateLimit.limit + 1) {
            await onLimitReached(req);
        }
    },
    keyGenerator: keyGenerator,
});

// What someone is on, from what the browser says rather than from how wide the window is: a
// narrow desktop window is not a phone and a tablet held sideways is not a desktop. Chromium
// answers the question outright in Sec-CH-UA-Mobile and sends it unasked; everyone else is read
// off the User-Agent.
// An iPad in its default desktop mode is indistinguishable from a Mac here and counts
// as one. `navigator.maxTouchPoints` is the only thing that tells them apart and it is client side
const deviceOf = function (req) {
    const ua = req.get("user-agent") || "";
    const os = /iPhone|iPad|iPod/.test(ua) ? "ios"
        : /Android/.test(ua) ? "android"
        : /CrOS/.test(ua) ? "chromeos"
        : /Windows/.test(ua) ? "windows"
        : /Macintosh|Mac OS X/.test(ua) ? "macos"
        : /Linux/.test(ua) ? "linux"
        : "other";
    const hint = req.get("sec-ch-ua-mobile");
    const mobile = hint ? hint === "?1" : /Mobi|Android|iPhone|iPod|iPad|Tablet|Silk|Kindle/.test(ua);
    return {os: os, mobile: mobile, key: mobile ? `${os}-mobile` : os};
};

module.exports = {
    deviceOf: deviceOf,
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
        let totalDonos = req.user.donoData.map(d => d.receivedValue).reduce((a, b) => a + b, 0);
        let dono = donoHelper(totalDonos);
        if (dono.premium) return premiumRateLimit(req, res, next);
        if (dono.plus) return plusRateLimit(req, res, next);
        if (dono.donor) return donorRateLimit(req, res, next);
        return regularRateLimit(req, res, next);
    }, isLoggedIn: function (req, res, next) {
        if (!(["/", "/admin", "/logout", "/changelog", "/changelogLegend", "/userCounts"]).includes(req._parsedOriginalUrl.path) && req.headers.referer && req.headers.referer.includes("viewuser")) {
            res.sendStatus(405);
            return;
        }
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/");
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