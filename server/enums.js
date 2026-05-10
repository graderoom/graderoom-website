module.exports.SyncStatus = {
    COMPLETE: "complete",
    ALREADY_DONE: "already done",
    NO_DATA: "no data",
    LOGIN_FAILED: "login failed",
    FAILED: "failed",
    UPDATING: "updating",
    HISTORY: "history",
    ACCOUNT_INACTIVE: "account-inactive",
    LIMIT: "limit",
    NOT_SYNCING: "",
    LOCAL: "local"
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

const _noGpaLetters = ["NC", "CR", "P", "W", false];
const _noGpaLetterStrings = _noGpaLetters.filter(l => typeof l === "string");
const _themeNames = {
    dark: ["dark", "oled-dark", "midnight-blue", "forest", "terminal"],
    light: ["light", "rose", "solarized-light"],
    premium: ["midnight-blue", "forest", "rose", "solarized-light", "terminal"]
};
const _themeCss = Object.fromEntries([..._themeNames.dark, ..._themeNames.light].map(theme => [theme, `/public/css/themes/${theme}/index.css`]));
const _themeLabels = {
    "light": "Graderoom Light",
    "dark": "Graderoom Dark",
    "oled-dark": "OLED Dark",
    "midnight-blue": "Midnight Blue",
    "forest": "Forest",
    "rose": "Rose",
    "solarized-light": "Solarized Light",
    "terminal": "Terminal"
};

module.exports.Constants = {
    classTypes: ["non-academic", "none", "ap", "honors"],
    uc_csuClassTypes: ["not_uc", "uc", "uc_ap", "uc_hon"],
    donoPlatforms: ["paypal", "venmo", "zelle", "cash", "gift"],
    noGpaLetters: _noGpaLetters,
    themes: {
        names: {
            dark: _themeNames.dark,
            light: _themeNames.light,
            premium: _themeNames.premium,
            fixed: [..._themeNames.dark, ..._themeNames.light],
            modes: ["light", "dark", "auto", "system"],
            all: ["auto", "system", ..._themeNames.dark, ..._themeNames.light]
        },
        css: _themeCss,
        labels: _themeLabels
    },
    validLetterGradeRegex: new RegExp(`^(?:${_noGpaLetterStrings.join("|")}|F|[A-D][+\-]?)$`)
}

module.exports.ColorPresets = {
    pale: "pale",
    pastel: "pastel",
    clear: "clear",
    bright: "bright",
    dull: "dull",
    custom: "custom"
}

Object.freeze(module.exports.SyncStatus);
Object.freeze(module.exports.Schools);
Object.freeze(module.exports.SchoolAbbr);
Object.freeze(module.exports.PrettySchools);
Object.freeze(module.exports.Constants);
Object.freeze(module.exports.ColorPresets);
