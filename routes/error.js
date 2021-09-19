const express = require('express');
const routes = express.Router()
const isAuth = require('../middleware/isauth');

const errorController = require('../controllers/error')

routes.get('/500',isAuth,errorController.get500Error);

routes.get('/',isAuth,errorController.getError);

routes.get('/link-sent',isAuth,errorController.getLinkSent);

exports.routes = routes;
