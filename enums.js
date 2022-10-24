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
}

module.exports.Constants = {
    classTypes: ["non-academic", "none", "ap", "honors"],
    uc_csuClassTypes: ["not_uc", "uc", "uc_ap", "uc_hon"],
    donoPlatforms: ["paypal", "venmo", "zelle"]
}

Object.freeze(module.exports.SyncStatus);
Object.freeze(module.exports.Schools);
Object.freeze(module.exports.Constants);
