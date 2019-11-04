let server = require('./graderoom.js');
let authenticator = require('./authenticator.js');

//Defaults to dark mode before login and new accounts TODO: this is temporary, should remember past mode
let defaultMode = true;

module.exports = function(app, passport) {

// normal routes ===============================================================

// show the home page (will also have our login links)
app.get('/', function(req, res) {

    if (req.isAuthenticated()) {

        let user = authenticator.getUser(req.user.username);
        let weightData = JSON.stringify(user.weights);
        let gradeDat = JSON.stringify(user.grades);
        
        res.render('authorized_index.ejs', {
            user: req.user,
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
        darkMode: defaultMode,
        message: req.flash('loginMessage')
    });
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.post('/deleteUser', isAdmin, function (req, res) {
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

app.post('/makeadmin', isAdmin, function (req, res) {
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

app.post('/removeadmin', isAdmin, function (req, res) {
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

app.get('/admin', isAdmin, function (req, res) {
    // admin panel TODO
    let allUsers = authenticator.getAllUsers();
    res.render('admin.ejs', {
        user: req.user,
        userList: allUsers,
        adminSuccessMessage: req.flash('adminSuccessMessage'),
        adminFailMessage: req.flash('adminFailMessage')
    });
});

app.get('/update',isLoggedIn, function(req, res) {

    //todo rate limits
    //todo use axios to contact python api and update data.

    res.redirect('/');
});

app.post('/updateappearance', isLoggedIn, (req, res) => {

    let darkMode = req.body.darkMode;
    req.user.darkMode = darkMode;
    res.redirect('/');
});

app.post('/changepassword', isLoggedIn, (req, res) => {

    let new_pass = req.body.password;
    let resp = authenticator.changePassword(req.user.username, new_pass);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});

app.post('/changeschoolemail', isLoggedIn, (req, res) => {

    let new_school_email = req.body.school_email;
    let resp = authenticator.changeSchoolEmail(req.user.username, new_school_email);
    if (resp.success) {
        res.status(200).send(resp.message);
    } else {
        res.status(400).send(resp.message);
    }
});

// process the login form
app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/', // redirect to the secure profile section
    failureRedirect : '/', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

// SIGNUP =================================
// show the signup form
app.get('/signup', function(req, res) {
    res.render('signup.ejs', {
        darkMode: defaultMode,
        message: req.flash('signupMessage')
    });
});


// app.post('/signup', isAdmin, passport.authenticate('local-signup', {
//     successRedirect : '/', // redirect to the secure profile section
//     failureRedirect : '/signup', // redirect back to the signup page if there is an error
//     failureFlash : true // allow flash messages
// }));

app.post('/signup', async function(req, res, next) {

        let username = req.body.username;
        let password = req.body.password;
        let s_email = req.body.school_email;

        console.log("Trying to create user: " + username);

        //check if can create here (i.e. username not in use)

        let resp = await authenticator.addNewUser(username, password, s_email, false, defaultMode);
        console.log(resp);

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

app.post('/update', isLoggedIn, async function(req,res) {

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
app.post('/updateweights', isLoggedIn, async function(req,res) {

    let className = req.body.className;
    let newWeights = JSON.parse(req.body.newWeights);

    let resp = authenticator.updateWeightsForClass(req.user.username, className, newWeights, true);
    if (resp.success) {
        req.flash('updateWeightMessageSuccess', resp.message);

    } else {
        req.flash('updateWeightMessageFail', resp.message);
    }
    res.redirect('/testupdateweights');
});

app.get('/testupdateweights', isAdmin, (req, res) => {

    res.render('updateweights.ejs', {
        darkMode: defaultMode,
        updateWeightMessageSuccess: req.flash('updateWeightMessageSuccess'),
        updateWeightMessageFail: req.flash('updateWeightMessageFail'),
    });
});

/**
 * END GENERAL USER MANAGEMENT
 */


// general web app
app.get('/*', function (req, res) {
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

