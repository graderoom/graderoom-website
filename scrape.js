let {PythonShell} = require("python-shell");

module.exports = {

    loginAndScrapeGrades: function (email, password, get_history=false) {

        let pythonPath;

        if (process.platform == "win32") {
            pythonPath = "py";
        } else {
            pythonPath = "python3";
        }

        let options = {
            mode: "json", // pythonPath: 'path/to/python',
            // pythonOptions: ['-u'], // get print results in real-time
            // // scriptPath: 'path/to/my/scripts',
            // // scriptPath: 'path/to/my/scripts',
            pythonPath: pythonPath, args: [email, password, get_history]
        };

        return new Promise(function (resolve) {

            PythonShell.run("./scrape.py", options, (err, results) => {

                // console.log("results");
                // console.log(results);

                let resp = results[0];

                if (err) {
                    // Error for when the python process fails
                    console.error("ERROR:" + err);
                    resolve({success: false, message: "Error getting grades."});
                } else if (resp.success === true) {
                    let new_grades = Object.assign({}, resp);
                    delete new_grades["success"];
                    resolve({success: true, new_grades: new_grades});
                } else {
                    // Error when scraping PowerSchool
                    console.error("ERROR:" + resp.message);
                    return resolve({success: false, message: resp.message});
                }

            });

        });

    }

};

