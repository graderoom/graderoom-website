let {PythonShell} = require('python-shell');

module.exports = {

    loginAndScrapeGrades: function(email, password) {
        //TODO return {success: true, message: "Done!"} etc

        let pythonPath;

        if (process.platform == 'win32') {
            pythonPath = 'py';
        } else {
            pythonPath = 'python3';
        }

        let options = {
            mode: 'json',
            // pythonPath: 'path/to/python',
            // pythonOptions: ['-u'], // get print results in real-time
            // // scriptPath: 'path/to/my/scripts',
            // // scriptPath: 'path/to/my/scripts',
            pythonPath: pythonPath,
            args: [email, password]
        };

        return new Promise(function(resolve) {

            PythonShell.run('./scrape.py', options, (err, results) => {

                // console.log("results");
                // console.log(results);

                let resp = results[0];

                if (err) {
                    // console.error("ERROR:"  + err);
                    resolve({success: false, message: "Error getting grades."});
                } else if (resp.success === true) {
                    resolve({success: true, new_grades: resp.grades})
                } else {
                    return resolve({success: false, message: resp.message})
                }
                // console.log(results);
            })

        });

    },

};

