let {PythonShell} = require("python-shell");

module.exports = {

    loginAndScrapeGrades: function (readableStream, school, email, password, data_if_locked = {}, term_data_if_locked = {}, get_history = false) {

        let pythonPath;

        if (process.platform === "win32") {
            pythonPath = "py";
        } else {
            pythonPath = "python3";
        }

        let options = {
            mode: "json", // pythonPath: 'path/to/python',
            pythonOptions: ['-u'], // get print results in real-time
            // // scriptPath: 'path/to/my/scripts',
            // // scriptPath: 'path/to/my/scripts',
            pythonPath: pythonPath,
            args: [school, email, password, JSON.stringify(data_if_locked), JSON.stringify(term_data_if_locked), get_history]
        };

        try {
            const pyshell = new PythonShell("./scrape.py", options);

            pyshell.on("message", (message) => {
                readableStream.push(message);
            });

            pyshell.on("close", () => {
                readableStream.destroy();
                console.log('Destroyed stream');
            });
        } catch (e) {
            console.log("Server ran out of memory probably");
            readableStream.push(JSON.stringify({success: false, message: 'Something went wrong'}));
            readableStream.destroy();
        }

    }

};

