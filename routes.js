let server = require('./graderoom.js');
let authenticator = require('./authenticator.js');

module.exports = function(app, passport) {

// normal routes ===============================================================

    // show the home page (will also have our login links)
app.get('/', function(req, res) {

    if (req.isAuthenticated()) {

        let gradeDat = JSON.stringify(authenticator.getUser(req.user.username).grades);

        res.render('authorized_index.ejs', {
            user: req.user,
            schoolUsername: req.user.schoolUsername,
            gradeData: gradeDat,
            updateGradesMessageSuccess: req.flash('updateGradesMessageSuccess'),
            updateGradesMessageFail: req.flash('updateGradesMessageFail')});
        return;
    }
    res.render('index.ejs', { message: req.flash('loginMessage') });
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


app.get('/admin', isAdmin, function (req, res) {
    // admin panel TODO
    let allUsers = authenticator.getAllUsers();
    res.render('admin.ejs', {
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

app.post('/changepassword', isLoggedIn, (req, res) => {

    let new_pass = req.body.password;
    let resp = authenticator.changePassword(req.user.username, new_pass);
    if (resp.success) {
        req.flash('settingsChangeMessageSuccess', resp.message);
    } else {
        req.flash('settingsChangeMessageFail', resp.message);
    }
    res.redirect('/settings')

});

app.post('/changeschoolusername', isLoggedIn, (req, res) => {

    let su = req.body.school_username;
    let resp = authenticator.changeSchoolUsername(req.user.username, su);
    if (resp.success) {
        req.flash('settingsChangeMessageSuccess', resp.message);
    } else {
        req.flash('settingsChangeMessageFail', resp.message);
    }
    res.redirect('/settings')

});

app.post('/changeschoolpassword', isLoggedIn, (req, res) => {

    let sp = req.body.school_password;
    let resp = authenticator.changeSchoolPassword(req.user.username, sp);
    if (resp.success) {
        req.flash('settingsChangeMessageSuccess', resp.message);
    } else {
        req.flash('settingsChangeMessageFail', resp.message);
    }
    res.redirect('/settings')

});

app.get('/settings', isLoggedIn, (req, res) => {
    res.render('settings.ejs', {
        settingsChangeMessageSuccess: req.flash('settingsChangeMessageSuccess'),
        settingsChangeMessageFail: req.flash('settingsChangeMessageFail'),
    });
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
    res.render('signup.ejs', { message: req.flash('signupMessage') });
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
        let s_password = req.body.school_password;

        console.log("Trying to create user: " + username);

        //check if can create here (i.e. username not in use)

        let resp = await authenticator.addNewUser(username, password, s_email, s_password, false);
        console.log(resp);


        passport.authenticate('local-login', {
            successRedirect : '/', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        })(req, res, next); // this was hard :(       
});

app.post('/update', isLoggedIn, async function(req,res) {

    let user = req.user.displayName;
    let pass = req.body.school_password;
    let resp = await authenticator.updateGrades(user,pass);
    if (resp.success) {
        req.flash('updateGradesMessageSuccess', resp.message);
    } else {
        req.flash('updateGradesMessageFail', resp.message);
    }

    res.redirect('/');

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

