const scraper = require("./scrape");
const dbClient = require("./dbClient");
const _ = require("lodash");
const fs = require('node:fs');

let credentials = {};

try {
    fs.writeFileSync("credentials.json", JSON.stringify({
        "school": "",
        "graderoom_username": "",
        "school_username": "",
        "password": "",
        "get_history": false
    }, null, 4), {flag: "wx"});
} catch (_) {}

credentials = require("../credentials.json");

if (Object.keys(credentials).length === 0) {
    credentials = {
        "school": "",
        "graderoom_username": "",
        "school_username": "",
        "password": "",
        "get_history": false
    };
}

module.exports = {
    /**
     * Scrapes grades using data from credentials.json.
     * *For testing purposes only*
     *
     * @returns {Promise<void>}
     */
    external_scrape: async function () {
        let mongoUrl;
        let prod = false;
        if (process.env.NODE_ENV === "production") {
            prod = true;
            mongoUrl = process.env.DB_URL;
        } else {
            mongoUrl = "mongodb://127.0.0.1:27017";
        }
        console.log(mongoUrl);
        await dbClient.config(mongoUrl, prod, process.env.port === "5998");
        let school = credentials["school"];
        let school_username = credentials["school_username"];
        let password = credentials["password"];

        const processor = async (data) => console.log(JSON.stringify(data));
        if (school === "basis") {
            if ([school_username, password].includes("")) throw new Error("Configure credentials.json");
            await scraper.loginAndScrapeGrades(processor, school, school_username, password);
            return;
        }
        let graderoom_username = credentials["graderoom_username"];

        if ([graderoom_username, school_username, password].includes("")) throw new Error("Configure credentials.json");

        let {
            term: oldTerm,
            semester: oldSemester
        } = (await dbClient.getMostRecentTermData(graderoom_username)).data.value;
        let term_data_if_locked = {term: oldTerm, semester: oldSemester};
        let data_if_locked = [];
        if (oldTerm && oldSemester) {
            let user = (await dbClient.getUser(graderoom_username, {[`grades.${oldTerm}.${oldSemester}`]: 1})).data.value;
            data_if_locked = user.grades[oldTerm][oldSemester].map(class_data => _.omit(class_data, ["grades"]));
        } else {
            term_data_if_locked = {};
        }

        let get_history = credentials["get_history"] ? "True" : false;

        await scraper.loginAndScrapeGrades(processor, school, school_username, password, data_if_locked, term_data_if_locked, get_history);
    }
}
