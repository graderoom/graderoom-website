let server = require('./graderoom.js');
let authenticator = require('./authenticator.js');


module.exports = function(app, passport) {

// normal routes ===============================================================

// show the home page (will also have our login links)
app.get('/', forceHTTPS, function(req, res) {

    if (req.isAuthenticated()) {

        let user = authenticator.getUser(req.user.username);
        let weightData = JSON.stringify(user.weights);
        let gradeDat = JSON.stringify(user.grades);
        
        res.render('authorized_index.ejs', {
            user: req.user,
            current: 'home',
            userRef: JSON.stringify(user),
            schoolUsername: req.user.schoolUsername,
            gradeData: gradeDat,
            weightData: weightData,
            updateGradesMessageSuccess: req.flash('updateGradesMessageSuccess'),
            updateGradesMessageFail: req.flash('updateGradesMessageFail'),
            settingsChangeMessageSuccess: req.flash('settingsChangeMessageSuccess'),
            settingsChangeMessageFail: req.flash('settingsChangeMessageFail'),
        });
        return;
    }
    res.render('index.ejs', {
        message: req.flash('loginMessage')
    });
});

app.get('/logout', [forceHTTPS, isLoggedIn], function(req, res) {
    req.logout();
    res.redirect('/');
});

app.post('/deleteUser', [forceHTTPS, isAdmin], function (req, res) {
    let username = req.body.deleteUser;
    console.log("Got request to delete: " + username);

    let resp = authenticator.deleteUser(username);
    console.log(resp);
    if (resp.success) {
        req.flash('adminSuccessMessage', resp.message);
    } else {
        req.flash('adminFailMessage', resp.message);
    }

    res.redirect('/admin')
});

app.post('/makeadmin', [forceHTTPS, isAdmin], function (req, res) {
    let username = req.body.newAdminUser;
    console.log("Got request to make admin: " + username);

    let resp = authenticator.makeAdmin(username);
    console.log(resp);
    if (resp.success) {
        req.flash('adminSuccessMessage', resp.message);
    } else {
        req.flash('adminFailMessage', resp.message);
    }

    res.redirect('/admin');
});

app.post('/removeadmin', [forceHTTPS, isAdmin], function (req, res) {
    let username = req.body.removeAdminUser;
    console.log("Got request to remove admin: " + username);

    let resp = authenticator.removeAdmin(username);
    console.log(resp);
    if (resp.success) {
        req.flash('adminSuccessMessage', resp.message);
    } else {
        req.flash('adminFailMessage', resp.message);
    }

    res.redirect('/admin');
});

app.get('/admin', [forceHTTPS, isAdmin], function (req, res) {
    // admin panel TODO
    let allUsers = authenticator.getAllUsers();
    res.render('admin.ejs', {
        user: req.user,
        userList: allUsers,
        adminSuccessMessage: req.flash('adminSuccessMessage'),
        adminFailMessage: req.flash('adminFailMessage')
    });
});

app.get('/update',[forceHTTPS, isLoggedIn], function(req, res) {

    //todo rate limits
    //todo use axios to contact python api and update data.

    res.redirect('/');
});

app.post('/updateappearance', [forceHTTPS, isLoggedIn], (req, res) => {
    let darkMode;
    darkMode = req.body.darkMode === 'on';
    authenticator.setMode(req.user.username, darkMode);
    res.redirect('/');
});

app.post('/changepassword', [forceHTTPS, isLoggedIn], (req, res) => {

    let new_pass = req.body.password;
    let resp = authenticator.changePassword(req.user.username, new_pass);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});

app.post('/changeschoolemail', [forceHTTPS, isLoggedIn], (req, res) => {

    let new_school_email = req.body.school_email;
    let resp = authenticator.changeSchoolEmail(req.user.username, new_school_email);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});

// process the login form
app.post('/login', forceHTTPS, passport.authenticate('local-login', {
    successRedirect : '/', // redirect to the secure profile section
    failureRedirect : '/', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

// SIGNUP =================================
// show the signup form
app.get('/signup', forceHTTPS, function(req, res) {
    res.render('signup.ejs', {
        message: req.flash('signupMessage'),
        needsBeta: server.needsBetaKeyToSignUp,
    });
});


// app.post('/signup', isAdmin, passport.authenticate('local-signup', {
//     successRedirect : '/', // redirect to the secure profile section
//     failureRedirect : '/signup', // redirect back to the signup page if there is an error
//     failureFlash : true // allow flash messages
// }));

app.post('/signup', forceHTTPS, async function(req, res, next) {

        let username = req.body.username;
        let password = req.body.password;
        let s_email = req.body.school_email;

        console.log("Trying to create user: " + username);

        //check if can create here (i.e. username not in use)

        let resp;
        if (server.needsBetaKeyToSignUp) {

            let bk = req.body.beta_key;
            resp = await authenticator.betaAddNewUser(bk, username, password, s_email, false);
            console.log("beta: " + resp);


        } else {

            resp = await authenticator.addNewUser(username, password, s_email, false);
            console.log("nonbeta: " + resp);

        }


        if (!resp.success) {
            req.flash('signupMessage', resp.message);
            res.redirect('/signup')
        } else {
            passport.authenticate('local-login', {
                successRedirect : '/', // redirect to the secure profile section
                failureRedirect : '/signup', // redirect back to the signup page if there is an error
                failureFlash : false // Don't want to flash messages to login page when using signup page
            })(req, res, next); // this was hard :(
        }
});

app.post('/update', [forceHTTPS, isLoggedIn], async function(req,res) {

    let pass = req.body.school_password;
    let resp = await authenticator.updateGrades(req.user.username,pass);
    if (resp.success) {
        req.flash('updateGradesMessageSuccess', resp.message);
    } else {
        req.flash('updateGradesMessageFail', resp.message);
    }

    res.redirect('/');

});

//must be called via client side ajax+js
app.post('/updateweights', [forceHTTPS, isLoggedIn], async function(req,res) {
    console.log(req.body);
    let className = req.body.className;
    let newWeights = JSON.parse(req.body.newWeights);

    let resp = authenticator.updateWeightsForClass(req.user.username, className, newWeights, true);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});

app.post('/changealertsettings', [forceHTTPS, isLoggedIn], (req, res) => {
    let resp = authenticator.setUpdateGradesReminder(req.user.username, req.body.updateGradesReminder);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});

app.post('/randomizeclasscolors', [forceHTTPS, isLoggedIn], (req, res) => {
    let resp = authenticator.setRandomClassColors(req.user.username, req.body.lockedColorIndices);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});

app.get('/finalgradecalculator', forceHTTPS, (req, res) => {

    if (req.isAuthenticated()) {
        res.render("final_grade_calculator.ejs", {
            current: 'calc',
            calculatorSuccessMessage: req.flash("calculatorSuccessMessage"),
            calculatorFailMessage: req.flash("calculatorFailMessage"),
            user: req.user,
            userRef: JSON.stringify(req.user),
            schoolUsername: req.user.schoolUsername,
        });
    } else {
        res.render("final_grade_calculator_logged_out.ejs", {
            calculatorSuccessMessage: req.flash("calculatorSuccessMessage"),
            calculatorFailMessage: req.flash("calculatorFailMessage"),
        });
    }

});

app.post('/getFinalWeightWithCategory', [forceHTTPS, isLoggedIn], (req, res) => {
    let resp = authenticator.getFinalWeightWithCategory(req.user.username, req.body.classIndex, req.body.categoryName, req.body.finalPoints, req.body.categoryWeight);
    if (resp.success) {
        res.status(200).send(resp.message.toString());
    } else {
        res.status(400).send(resp.message.toString());
    }
});

app.post('/calculate', [forceHTTPS, isLoggedIn], (req, res) => {
    let resp = authenticator.calculate(req.user.username, req.body.currentGrade, req.body.classIndex, req.body.categoryName, req.body.categoryWeight, req.body.goal);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});
  
app.get("/betakeys", [forceHTTPS, isAdmin], (req, res) => {

    res.render("betakeys.ejs", {
        betaKeyData: authenticator.getAllBetaKeyData(),
        betaKeySuccessMessage: req.flash("betaKeySuccessMessage"),
        betaKeyFailMessage: req.flash("betaKeyFailMessage"),
        user: req.user,
    })

});

app.post("/newbetakey", [forceHTTPS, isAdmin], (req, res) => {

    // let bk = req.body.beta_key;
    let bk = makeKey(7);
    let resp = authenticator.addNewBetaKey(bk);

    if (resp.success) {
        req.flash('betaKeySuccessMessage', resp.message);
    } else {
        req.flash('betaKeyFailMessage', resp.message);
    }

    res.redirect('/betakeys');

});

app.post("/deletebetakey", [forceHTTPS, isAdmin], (req, res) => {

    let bk = req.body.beta_key;
    let resp = authenticator.removeBetaKey(bk);

    if (resp.success) {
        req.flash('betaKeySuccessMessage', resp.message);
    } else {
        req.flash('betaKeyFailMessage', resp.message);
    }

    res.redirect('/betakeys');

});

/**
 * END GENERAL USER MANAGEMENT
 */


// general web app
app.get('/*', forceHTTPS, function (req, res) {
    res.redirect('/');
});


// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    res.redirect('/');
    }
};

function forceHTTPS(req, res, next) {

    if (!server.usingHTTPS) {
        return next()
    }

    if(req.secure){
        return next();
    }
    res.redirect("https://" + req.headers.host + req.url);
}

function makeKey(length) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}