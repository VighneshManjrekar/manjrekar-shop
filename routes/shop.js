const express = require('express');

const shopController = require('../controllers/shop');
const isAuth = require('../middleware/isauth');

const routes = express.Router();

routes.get('/', shopController.getIndex);

routes.get('/products', shopController.getProductList);

routes.get('/products/:productId', shopController.getProduct);

routes.post('/delete-cart-item', isAuth, shopController.deleteCartItem);

routes.get('/cart', isAuth, shopController.getCart);

routes.post('/cart', isAuth, shopController.postCart);

routes.get('/order', isAuth, shopController.getOrder);

routes.get('/checkout',shopController.getCheckout);

routes.get('/checkout/success', isAuth, shopController.getCheckoutSuccess);

routes.get('/checkout/cancel', isAuth, shopController.getCheckout);

routes.get('/order/:orderId', isAuth, shopController.getInvoice);

module.exports = routes;