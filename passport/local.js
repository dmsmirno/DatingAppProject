const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const keys = require('../config/keys');
const bcrypt = require('bcryptjs');

passport.serializeUser((user,done) => {
    return done(null, user.id);
});

passport.deserializeUser((id,done) => {
    User.findById(id,(err, user) => {
        return done(err,user);
    });
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
},(email, password, done) => {
    User.findOne({email:email}).then((user) => {
        if(!user){
            console.log('NO USER RETURNED!!!!');
            return done(null,false);
        } 
        bcrypt.compare(password, user.password, (err,isMatch) => {
            if (err){
                throw err;
            }
            if(isMatch){
                return done(null, user);
            } else {
                return done(null, false);
            }
        });

    }).catch((err) => {
        console.log(err);
    });  
}));