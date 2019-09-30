let {PythonShell} = require('python-shell');

module.exports = {

    loginAndScrapeGrades: async function(email, password) {
        //TODO return {success: true, message: "Done!"} etc

        let options = {
            mode: 'json',
            // pythonPath: 'path/to/python',
            // pythonOptions: ['-u'], // get print results in real-time
            // // scriptPath: 'path/to/my/scripts',
            // // scriptPath: 'path/to/my/scripts',
            args: [email, password]
        };

        PythonShell.run('./scrape.py', options, (err, results) => {

            if (err) {
                // console.error("ERROR:"  + err);
                return {success: false, message: "Error getting grades."}
            }
            return {success: true, new_grades: results}
            // console.log(results);
        })

    },

};

