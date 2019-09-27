var server = require('./frontend_server.js');
let authenticator = require('./authenticator.js');
let api_client = require('./api_client.js');

module.exports = function(app, passport) {

// normal routes ===============================================================

    // show the home page (will also have our login links)
app.get('/', function(req, res) {

    if (req.isAuthenticated()) {
        res.render('authorized_index.ejs', {user: req.user}); // todo render something else for authenticators
        return;
    }
    res.render('index.ejs');
});


app.post('/deleteUser', isAdmin, function (req, res) {
    //TODO
});

app.get('/admin', isAdmin, function (req, res) {
    // admin panel TODO    
});

app.get('/update',isLoggedIn, function(req, res) {

    //todo rate limits
    //todo use axios to contact python api and update data.

    res.redirect('/');
});


// process the login form
app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

app.get('/login', function(req, res) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
});

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

app.post('/signup', function(req, res, next) {

        let username = req.body.username;
        let password = req.body.password;
        let s_email = req.body.school_email;
        let s_password = req.body.school_password;

        console.log("Trying to create user: " + username);

        //check if can create here (i.e. username not in use)

        resp = authenticator.addNewUser(username, password, s_email, s_password);
        resp_api = api_client.createAPIuser(s_email, s_password) //todo parse json
        console.log(resp_api)
        passport.authenticate('local-login', {
            successRedirect : '/', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        })(req, res, next); // this was hard :(       
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

