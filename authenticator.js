const _ = require("lodash");

module.exports = {

    /* class database */
    getAllClassData: function () {
        let classes = Object.assign({}, db.get("classes").value());
        delete classes["version"];
        return classes;
    }, //TODO


    /* user functions
     */

    /**
     * CHANGE dbUserVersion whenever you change this function
     * @param username user to update
     */
    bringUpToDate: function (username, term, semester, className) {
        let lc_username = username.toLowerCase();
        let userRef = db.get("users").find({username: lc_username});
        let user = userRef.value();
        let classes = db.get("classes").value();

        for (let g = 0; g < Object.keys(user.grades).length; g++) {
            let _term = Object.keys(user.grades)[g];
            if (term && _term !== term) {
                continue;
            }
            for (let h = 0; h < Object.keys(user.grades[_term]).length; h++) {
                let _semester = Object.keys(user.grades[_term])[h];
                if (semester && _semester !== semester) {
                    continue;
                }
                for (let i = 0; i < user.grades[_term][_semester].length; i++) {
                    let _className = user.grades[_term][_semester][i].class_name;
                    if (className && _className !== className) {
                        continue;
                    }
                    console.log("" + Date.now() + " | Bringing class up to date: " + (i + 1) + " of " + user.grades[_term][_semester].length + " in " + _term + " " + _semester);
                    let teacherName = user.grades[_term][_semester][i].teacher_name;

                    //Add all semesters to db
                    if (!dbContainsTerm(_term, _semester)) {
                        this.addDbTerm(_term, _semester);
                        console.log("adding term");
                    }
                    //Add all classes to db
                    if (!dbContainsClass(_term, _semester, _className, teacherName)) {
                        this.addDbClass(_term, _semester, _className, teacherName);
                    }

                    // Ignore if no teacher (means no assignments)
                    if (!teacherName) {
                        continue;
                    }

                    // Determine needed weights
                    let goodWeights = [];
                    for (let j = 0; j < user.grades[_term][_semester][i].grades.length; j++) {
                        if (!goodWeights.includes(user.grades[_term][_semester][i].grades[j].category)) {
                            goodWeights.push(user.grades[_term][_semester][i].grades[j].category);
                        }
                    }

                    // Add hasWeights: false
                    if (!Object.keys(user.weights[_term][_semester][_className]["weights"]).length) {
                        userRef.get("weights").get(_term).get(_semester).get(_className).set("hasWeights", false).write();
                    }

                    // Add all weights that exist in user grades
                    for (let j = 0; j < goodWeights.length; j++) {
                        if (!Object.keys(user.weights[_term][_semester][_className]["weights"]).includes(goodWeights[j])) {
                            user.weights[_term][_semester][_className]["weights"][goodWeights[j]] = null;
                        }
                    }

                    //Updates weights from classes db
                    if (userRef.get("weights").get(_term).get(_semester).get(_className).get("custom").value() === false && dbContainsClass(_term, _semester, _className, teacherName)) {
                        if (classes[_term][_semester][_className][teacherName]["hasWeights"] == "false" || Object.keys(classes[_term][_semester][_className][teacherName]["weights"]).length > 0) {
                            this.updateWeightsForClass(username, _term, _semester, _className, classes[_term][_semester][_className][teacherName]["hasWeights"], classes[_term][_semester][_className][teacherName]["weights"], false, false);
                        }
                    }

                    //Remove any weights that don't exist in user grades
                    let max = Object.keys(user.weights[_term][_semester][_className]["weights"]).length;
                    for (let j = 0; j < max; j++) {
                        if (!goodWeights.includes(Object.keys(user.weights[_term][_semester][_className]["weights"])[j])) {
                            delete user.weights[_term][_semester][_className]["weights"][Object.keys(user.weights[_term][_semester][_className]["weights"])[j--]];
                            max--;
                        }
                    }

                    //Set to point-based if only one category exists (& category is null)
                    if (Object.keys(user.weights[_term][_semester][_className]["weights"]).length === 1) {
                        if (user.weights[_term][_semester][_className]["weights"][Object.keys(user.weights[_term][_semester][_className]["weights"])[0]] == null) {
                            user.weights[_term][_semester][_className]["hasWeights"] = "false";
                        }
                    }

                    //Add user's weights as suggestions
                    this.addWeightsSuggestion(lc_username, _term, _semester, _className, teacherName, user.weights[_term][_semester][_className]["hasWeights"], user.weights[_term][_semester][_className]["weights"]);

                    //Set custom to not custom if it is same as classes db
                    if (user.weights[_term][_semester][_className]["custom"] && dbContainsClass(_term, _semester, _className, teacherName)) {
                        user.weights[_term][_semester][_className]["custom"] = isCustom({
                                                                                            "weights": user.weights[_term][_semester][_className]["weights"],
                                                                                            "hasWeights": user.weights[_term][_semester][_className]["hasWeights"]
                                                                                        }, {
                                                                                            "weights": classes[_term][_semester][_className][teacherName]["weights"],
                                                                                            "hasWeights": classes[_term][_semester][_className][teacherName]["hasWeights"]
                                                                                        });
                    }
                }
            }
        }
    }, //TODO
};
