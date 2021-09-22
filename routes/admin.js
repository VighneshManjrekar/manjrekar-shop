const express = require('express');

const { check } = require('express-validator');

const routes = express.Router()

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/isauth');

routes.get('/add-product',isAuth,adminController.getAddProduct);

routes.get('/products',isAuth, adminController.getProducts);

routes.post('/add-product',  [

    check('title').notEmpty().withMessage('Pleas enter a title for the product').trim(),
    check('description').trim().notEmpty().withMessage('Give some brief description about your product'),
    check('price').trim().isNumeric().withMessage('Please enter a proper price')

] ,isAuth, adminController.postAddProduct);

routes.get('/edit-product/:productId',isAuth,adminController.getEditProduct);

routes.delete('/products/:productId',isAuth,adminController.deleteProduct);

routes.post('/edit-product',
[
    check('title').notEmpty().withMessage('Pleas enter a title for the product').trim(),
    check('description').trim().notEmpty().withMessage('Give some brief description about your product').trim(),
    check('price').trim().isNumeric().withMessage('Please enter a proper price').trim()
],isAuth,adminController.postEditProduct);
module.exports = routes;