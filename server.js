const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const app = express();
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
//load keys file
const Keys = require('./config/keys');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
//run git command in onlinedating app to launch nodemon: npm run dev

//connect to mLab MongoDB
mongoose.connect(Keys.MongoDB, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Server is connected to MongoDB')
}).catch((err) => {
    console.log(err);
});
//Load models
const Message = require('./models/message');
const User = require('./models/user')

//load helpers
const {requireLogin,ensureGuest} = require('./helpers/auth');

//use body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));


// config for auth
app.use(cookieParser());
app.use(session({
    secret: 'mysecret',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req,res,next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// express static folder to get js, css files
app.use(express.static('public'));

//make user a global object
app.use((req,res,next) => {
    res.locals.user = req.user || null;
    next();
});

//load google strategy
require('./passport/google');

//load facebook strategy
require('./passport/facebook');

//load local login strategy
require('./passport/local');
//environment var for port
const port = process.env.PORT || 3000;


// view engine setup with handlebars 
app.engine('handlebars', exphbs({defaultLayout:'main'}));

app.set('view engine', 'handlebars');


app.get('/',ensureGuest,(req,res) => {
    res.render('home', {
        title: 'Home'
    });
});

app.get('/about',ensureGuest,(req,res) => {
    res.render('about', {
        title: 'About'
    });
});

app.get('/contact',ensureGuest, (req,res) => {
    res.render('contact', {
        title: 'Contact'
    });
});

app.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['email']
}));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/'
}));

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile']
}));

app.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: '/profile',
    failureRedirect: '/'
}));

app.post('/contactUs', (req,res)=> {
    console.log(req.body);
    const newMessage = {
        fullname: req.body.fullname,
        email: req.body.email,
        message: req.body.message,
        date: new Date()
    }
    new Message(newMessage).save((err, message) => {
        if(err){
            throw(err);
        } else {
            Message.find({}).lean().then((messages) => {
                if (messages) {
                    res.render('newmessage', {
                        title: 'Sent',
                        messages:messages
                    });
                } else {
                    res.render('noMessage', {
                        title: 'Not Found'
                    });
                }
            });
        }
    });
});

app.get('/newAccount',(req,res) => {
    res.render('newAccount', {
        title: "Sign Up"
    });
});

app.post('/signup',(req,res) => {
    let errors = [];
    if(req.body.password !== req.body.password2) {
        errors.push({text: 'Passwords don\'t match'});
    }
    if (req.body.password.length < 5) {
        errors.push({text: 'Password must be at least 5 characters long'});
    }
    if(errors.length > 0){
        res.render('newAccount', {
            errors: errors,
            title: 'Error',
            fullname: req.body.username,
            email: req.body.email,
            password: req.body.password,
            password2: req.body.password2
        });
    } else {
        User.findOne({email:req.body.email}).then((user) => {
            if(user){
                let errors = [];
                errors.push({text:"User with this email already exists."});
                res.render('newAccount', {
                    errors: errors,
                    title: 'Error',
                    fullname: req.body.username,
                    email: req.body.email,
                    password: req.body.password,
                    password2: req.body.password2
                });
            } else {
                var salt = bcrypt.genSaltSync(10);
                var hash = bcrypt.hashSync(req.body.password, salt);
                const newUser = {
                    fullname: req.body.username,
                    email: req.body.email,
                    password: hash
                }
                new User(newUser).save((err,user) => {
                    if(err) {
                        throw err;;
                    }
                    if (user) {
                        let success = [];
                        success.push({text: 'Thanks for making an account! Log in below: '});
                        res.render('home', {
                            errors: errors,
                            success: success
                        });
                        
                    }
                });
            }
        });
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect:'/profile',
    failureRedirect:'/loginErrors'
}));

app.get('/loginErrors', (req,res) => {
    let errors = [];
    errors.push({text:'User not found or password is incorrect'});
    res.render('home', {
        errors: errors
    });
});

app.get('/logout',(req,res) => {
    User.findById({_id:req.user._id}).then((user) => {
        user.online = false;
        user.save((err,user) => {
            if(err){
                throw err;
            }
            if(user){
                req.logout();
                res.redirect('/');
            }
        });
    });
})

app.get('/profile',requireLogin, (req,res) => {
    User.findById({_id:req.user._id}).then((user) => {
        if(user) {
            user.online = true;
            user.save((err,user) => {
                if(err){
                    throw err;
                } 
            });
        }
    });
    User.findById({_id:req.user._id}).lean().then((user) => {
        if(user) {
            res.render('profile', {
                title: 'Profile',
                user:user
            });
        }
    });
});

app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
});