const express = require('express');

const authController = require('../controllers/auth');
const User = require('../models/user');

const { check } = require('express-validator');

const routes = express.Router()

routes.get('/sign-up',authController.getSignUp);

routes.get('/sign-in',authController.getSignIn);

routes.post('/sign-up',[
    
    check('userName')
    .custom((val,{req})=>{
        if(val==''){
            throw new Error('Enter Your Full Name!')
        }else{
            return true;
        }
    })
    .trim(),
    
    check('email')
    .isEmail()
    .withMessage('Enter a valid Email!')
    .custom((val,{req})=>{
        return User.findOne({ email: val }).then(user => {
            if (user) {
                return Promise.reject('Email is already in use');
            }
        })
    }),

    check('password')
    .trim()
    .isLength({min: 6})
    .withMessage('Password should contain more than 6 characters!'),
], authController.postSignUp);

routes.post('/sign-in',authController.postSignIn);

routes.post('/logout', authController.postLogOut);

routes.get('/reset', authController.getReset);

routes.post('/reset', authController.postReset);

routes.get('/reset/:token', authController.getNewPassword);

routes.post('/new-password', authController.postNewPassword);

module.exports = routes;