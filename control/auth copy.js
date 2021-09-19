require('dotenv').config()
const bcrypt = require('bcryptjs');
const User = require('../models/user');
// const nodemailer = require('nodemailer');
// const sgTransport = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// const SENDGRID_PASS = process.env.SENDGRID_PASS;

// const options = {
//     auth: {
//         api_key: SENDGRID_PASS
//     }
// }

// const mailer = nodemailer.createTransport(sgTransport(options));

exports.postSignUp = (req, res, next) => {
    const email = req.body.email.toLowerCase();
    const userName = req.body.userName;
    const password = req.body.password;
    const error = validationResult(req);
    
    const userNameErr = error.mapped().userName != undefined ? error.mapped().userName.msg : null
    const emailErr = error.mapped().email != undefined ? error.mapped().email.msg : null
    const passwordErr = error.mapped().password != undefined ? error.mapped().password.msg : null

    if (!error.isEmpty()) {
        let errs = {
            userNameErr,
            emailErr,
            passwordErr
        };
        
        return res.status(400).render('auth/sign-up', {
            path: '/sign-up',
            pageTitle: 'Sign Up',
            message:errs,
            oldInput: {
                email,userName,password,
            }
        });
    }
    bcrypt.hash(password, 12)
    .then(hashedPass => {
        const user = new User({
            userName,
            email: email,
            password: hashedPass,
            cart: { items: [] }
        })
        user.save();
    })
    .then(result => {
        res.redirect('/sign-in');
       
        return mailer.sendMail({
        to: email,
        from: process.env.MAIL_ID,
        subject: 'Registration Successful',
        html: `<h1>Hello ${userName}!!<br> You are successfully registered!!</h1>`
        })
        return 'mail Sent!'
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })

}

exports.getSignUp = (req, res, next) => {
    res.render('auth/sign-up', {
        path: '/sign-up',
        pageTitle: 'Sign Up',
        message: req.flash('invalidEmail'),
        oldInput: {
            email:'',userName:'',password:'',
        }
    })
}

exports.postSignIn = (req, res, next) => {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;
    User.findOne({ email}).then(user => {
        if(!user){
            return res.status(400).render('auth/sign-in', {
                path: '/sign-up',
                pageTitle: 'Sign Up',
                emailErr:'No user was found with this Email',
                passwordErr: '',
                oldInput: {
                    email,password,
                }
            })
        }
        bcrypt
        .compare(password, user.password) 
        .then(isMatch => {
            if (isMatch) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                res.redirect('/');
                return mailer.sendMail({
                    to: email,
                    from: process.env.MAIL_ID,
                    subject: 'Login Successful',
                    html: `<h1>${user.userName} Welcome to node shop!!</h1>`
                    })
                // return 'mail sent!'
            }else{
                return res.status(400).render('auth/sign-in', {
                    path: '/sign-up',
                    pageTitle: 'Sign Up',
                    emailErr: '',
                    passwordErr:'Invalid Email or Password!',
                    oldInput: {
                        email,password,
                    }
                })
            }
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
}

exports.getSignIn = (req, res, next) => {
    res.render('auth/sign-in', {
        path: '/sign-up',
        pageTitle: 'Sign In',
        message: req.flash('invalidPass'),
        emailErr: '',
        passwordErr: '',
        oldInput: {
            email:'',password:'',
        },
    })
}

exports.postLogOut = (req,res) => {
    req.session.destroy(()=>{
        res.redirect('/');
    })
}

exports.getReset = (req,res) => {

    res.render('auth/reset',{
        path: '/reset',
        pageTitle: 'Reset Password',
        message: req.flash('invalidEmail')
    })
}

exports.postReset = (req,res,next) => {
    crypto.randomBytes(32,(err,buffer)=>{
        if(err){
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email.toLowerCase()})
        .then(user=>{
            if(!user){
                req.flash('invalidEmail', 'Invalid Email');
                return res.redirect('/reset');
            }
            user.resetToken = token;
            user.resetTokenExpiry = Date.now() + (1000 * 60 * 60 )
            return user.save()
        }).then(result => {
            res.redirect('/link-sent')
            return mailer.sendMail({
                to: req.body.email.toLowerCase(),
                from: process.env.MAIL_ID,
                subject: 'Reset Password',
                html: `<p>You requested password reset.</p><p>Click this <a href="https://manjrekar-shop.herokuapp.com/reset/${token}">link</a> to reset the password</p>`
                })
            // return true
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
    })
}

exports.getNewPassword = (req,res,next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token, 
        resetTokenExpiry: { $gt : Date.now() }
    }).then(user=>{
        res.render('auth/new-password',{
            path: '/new-password',
            pageTitle: 'Reset Password',
            message: req.flash('invalidEmail'),
            userId: user._id,
            passwordToken: token
        })
    })    
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
}

exports.postNewPassword = (req,res,next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const token = req.body.passwordToken;
    let resetUser;

    User.findOne({
        resetToken: token,
        resetTokenExpiry: {$gt: Date.now()},
        _id: userId
    }).then(user=>{
        resetUser = user;
        return bcrypt.hash(newPassword,12);
    }).then(hashedPass=>{
        resetUser.password = hashedPass;
        resetUser.resetToken = null;
        resetUser.resetTokenExpiry = undefined;
        return resetUser.save()
    }).then(result=>{
        res.redirect('/sign-in')
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
}