var express = require('express');
var passport = require("passport");
var bodyParser  = require("body-parser");
var mongoose = require("mongoose");
var LocalStrategy= require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var flash = require("connect-flash");
var moment = require("moment");
var app=express();

mongoose.connect('mongodb://localhost/gate', {useNewUrlParser: true, useUnifiedTopology: true});
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));

var userSchema = new mongoose.Schema({
    username: String,
    password: String,
});

userSchema.plugin(passportLocalMongoose);

var User = mongoose.model("User", userSchema);

var clockSchema = new mongoose.Schema({
    link: String,
    id: String,
    username: String,
    time: String
})

var Clock = mongoose.model("Clock", clockSchema);

//PASSPORT CONFIG
app.use(require('express-session')({
    secret: "I can do it!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());

isLoggedIn = function(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Please Login first!");
    res.redirect("/login");
}


app.use(function(req,res,next){   
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


app.get("/",function(req,res){
    res.render("index.ejs");
})

 app.get('/login', function(req, res){
     res.render("login.ejs");
 });

 app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}), function(req,res){
});

app.get("/logout", function(req, res){
    req.logOut(function(){
        req.flash("success", "Successfully logged out!");
        res.redirect("/login");
    });
});

app.get('/signup', function(req, res){
    res.render("signup.ejs");
})

app.get("/add", function(req, res){
    res.render("add.ejs");
});

app.post("/api-call", isLoggedIn, async function(req, res){

    var link = req.body.link;

    var id = youtube_parser(link);

    var url = "https://www.googleapis.com/youtube/v3/videos?id=" + id + "&key=AIzaSyCaxLXyB99n1t6XT3kWJaYgaJKmO8Bf7ok&part=snippet,contentDetails,statistics,status";
    try {
        const meow = await fetch(url);
    
        const response = await meow.json();

        var duration = response.items[0].contentDetails.duration;
        var x = moment.duration(duration, moment.ISO_8601);

        var body = {
            link: req.body.link,
            id: req.user.id,
            username: req.user.username,
            time: x.asSeconds()
        }

        Clock.create(body).then(function(){
            res.send("Data added!");
        }).catch(function(error){
            console.log(error);
            res.send("Some error ocurred!");
        })
        
      } catch (err) {
        console.log(err.message); //can be console.error
      }
});

app.get("/profile/:id", isLoggedIn, function(req, res){
    console.log(req.params.id);
    console.log(req.user.id);
    // Clock.findById({id: req.params.id}).then(function(result){
    //     res.send(result);
    // }).catch(function(error){
    //     console.log(error);
    //     res.send("Something went wrong!");
    // })
});

function youtube_parser(url){
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match&&match[7].length==11)? match[7] : false;
}

 app.post("/signup", function(req, res){
    var user = {
                username: req.body.username, 
                };
                
    User.register(new User(user), req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            res.redirect("/login");
        }
        passport.authenticate("local")(req,res, function(){
            res.redirect("/");
        });    
    });
})

 app.listen(3000, function(){
    console.log("Server is running on port 3000!");
 });
 