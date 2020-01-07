var express = require('express'),
    app = express(),
    PORT = 5000 || process.env.port,
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    methodOverride = require('method-override');

//Importing passport libraries
var passport = require('passport'),
    localStrategy = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose');

app.set("view engine","ejs");
app.use(express.static("assets"));
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({extended:true}));
mongoose.connect("mongodb://localhost/event_db");


//=====================
//       MODELS
//=====================

//User Model
var userSchema = new mongoose.Schema({
    username : String,
    password : String,
    club_name : String,
    club_head_name : String,
    contact : Number,
    email : String
},{timestamps : true});

userSchema.plugin(passportLocalMongoose);

var User = mongoose.model("User", userSchema);

//Application model
var appSchema = new mongoose.Schema({
    to : String,
    from : String,
    subject : String,
    purpose : String,
    timing : String,
    description : String,
    applicant : String,
    author : {
        id : {
            type : mongoose.Schema.Types.ObjectId,
            rel : "User"
        },
        username : String,
        email : String
    },
    isVerif1 : Boolean,
    isVerif2 : Boolean
}, {timestamps : true});

var Application = mongoose.model("Application", appSchema);

//Express-session setup
app.use(require("express-session")({
    secret : "I am AJ",
    resave : false,
    saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
})

//=====================
//       ROUTES
//=====================


//Home route
app.get("/", function(req, res){
    res.render("home");
});

//Application route
app.get("/application", function(req, res){
    User.find({}, function(err, foundUser){
        if(err)
            console.log(err);
        else
            res.render("application", {user : foundUser});
    });
});

app.get("/application/new", function(req, res){
    res.render("newapplication");
});

app.post("/application", function(req, res){
    Application.create({
        to : req.body.to,
        from : req.body.from,
        subject : req.body.subject,
        purpose : req.body.purpose,
        timing : req.body.timing,
        description : req.body.description,
        applicant : req.body.applicant,
        author : {
            id : req.user._id,
            username : req.user.username,
            email : req.user.email 
        },
        isVerif1 : false,
        isVerif2 : false
    }, function(err, foundApp){
        if(err)
            console.log(err);
        else
        {
            foundApp.save();
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
            to: 'ayushjainfff@gmail.com',
            from: 'ayushjainrksh@gmail.com',
            subject: 'Sending with SendGrid is Fun',
            text: 'and easy to do anywhere, even with Node.js',
            html : '<form action="http://localhost:5000/application/verify1/'+foundApp._id+'"?_method=PUT" method="POST" enctype="multipart/form-data"><button type = "submit">Approve</button></form>'
            };
            sgMail.send(msg);

            res.redirect("/");
        }
    });
});

app.get("/application/view",function(req,res){
    Application.find({}, function(err, foundApp){
        if(err)
            console.log(err);
        else
            res.render("viewapplication", {applications : foundApp});
    });
});

//Show route
app.get("/application/view/:id", function(req, res){
    Application.findById(req.params.id, function(err, foundApp){
        if(err)
            console.log(err);
        else
            res.render("view", {application : foundApp});
    });
});

app.post("/application/verify1/:id", function(req, res){
    // console.log("PUT Here");
    Application.findById(req.params.id, function(err, foundApp){
        if(err)
        {
            console.log(err);
        }
        else
        {
            foundApp.isVerif1 = true;
            foundApp.save();
            res.redirect('/');    
        }
    })
});

// AUTH ROUTES

//Register Route
app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){
    var user = new User({username : req.body.username, club_name : req.body.club_name, club_head_name : req.body.club_head_name, contact : req.body.contact, email : req.body.email});
    User.register(user, req.body.password, function(err, newUser){
        if(err)
           console.log(err);
        else
        {
            passport.authenticate("local")(req, res, function(){
                if(err)
                    console.log(err);
                else
                    res.redirect("/");
                    // res.send("success");
            });
        }
    });
});

//Login Route
app.get("/login", function(req, res){
    res.render("login");
});

app.post("/login", passport.authenticate("local",{
    successRedirect : "/",
    failureRedirect : "/login"
}));

//Logout Route
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/login");
})

app.listen(PORT, function(err){
    if(err)
        console.log(err);
    else
        console.log("Server started at PORT : "+PORT);
});