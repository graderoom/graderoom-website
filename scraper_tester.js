const scraper = require("./scrape");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("credentials.json");
const credentials = low(adapter);
const authenticator = require("./authenticator");
const _ = require("lodash");


credentials.defaults({"graderoom_username": "", "school_username": "", "password": "", "get_history": false}).write();


module.exports = {
    /**
     * Scrapes grades without writing to user db (for testing only)
     * Update
     * @returns {Promise<void>}
     */
    external_scrape: async function () {
        let graderoom_username = credentials.get("graderoom_username").value()
        let school_username = credentials.get("school_username").value();
        let password = credentials.get("password").value();

        if ([graderoom_username, school_username, password].includes("")) throw new Error("Configure credentials.json");

        let userRef = authenticator.db.get("users").find({username: graderoom_username});

        let {term: oldTerm, semester: oldSemester} = authenticator.getMostRecentTermData(graderoom_username);
        let term_data_if_locked = {term: oldTerm, semester: oldSemester};
        let data_if_locked = [];
        if (oldTerm && oldSemester) {
            data_if_locked = userRef.get("grades").value()[oldTerm][oldSemester].map(class_data => _.omit(class_data, ["grades"]));
        } else {
            term_data_if_locked = {};
        }

        let get_history = credentials.get("get_history").value();
        let resp = await scraper.loginAndScrapeGrades(school_username, password, data_if_locked, term_data_if_locked, get_history);
        console.log(resp);
    }
}
