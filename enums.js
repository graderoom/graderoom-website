module.exports.SyncStatus = {
    COMPLETE: "complete",
    ALREADY_DONE: "already done",
    NO_DATA: "no data",
    FAILED: "failed",
    UPDATING: "updating",
    HISTORY: "history",
    ACCOUNT_INACTIVE: "account-inactive",
    NOT_SYNCING: "",
}

module.exports.Schools = {
    BELL: "bellarmine",
    BISV: "basis",
    NDSJ: "ndsj",
}

module.exports.PrettySchools = {
    bellarmine: "Bellarmine College Preparatory",
    BELL: "Bellarmine College Preparatory",
    BCP: "Bellarmine College Preparatory",
    basis: "BASIS Independent Silicon Valley",
    BISV: "BASIS Independent Silicon Valley",
    ndsj: "Notre Dame High School",
    NDSJ: "Notre Dame High School",
}

module.exports.SchoolAbbr = {
    bellarmine: "BCP",
    BELL: "BCP",
    BCP: "BCP",
    "Bellarmine College Preparatory": "BCP",
    basis: "BISV",
    BISV: "BISV",
    "BASIS Independent Silicon Valley": "BISV",
    ndsj: "NDSJ",
    NDSJ: "NDSJ",
    "Notre Dame High School": "NDSJ",
}

module.exports.Constants = {
    classTypes: ["non-academic", "none", "ap", "honors"],
    uc_csuClassTypes: ["not_uc", "uc", "uc_ap", "uc_hon"],
    donoPlatforms: ["paypal", "venmo", "zelle"]
}

Object.freeze(module.exports.SyncStatus);
Object.freeze(module.exports.Schools);
Object.freeze(module.exports.SchoolAbbr);
Object.freeze(module.exports.PrettySchools);
Object.freeze(module.exports.Constants);
