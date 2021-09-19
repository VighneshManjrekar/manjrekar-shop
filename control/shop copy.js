const path = require('path');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const Pdf = require('pdfkit');
const Product = require('../models/product');
const Order = require('../models/order');
const pdf = require('../models/pdf');

exports.getIndex = (req, res, next) => {
    const PAGE_LIMIT = 3
    const page = +req.query.page || 1;
    let totalItems;
    Product
    .find()
    .countDocuments()
    .then(totalProducts => {
        totalItems = totalProducts;
        return Product.find().skip((page-1)*PAGE_LIMIT).limit(PAGE_LIMIT)
    })
    .then(products=>{

        res.render('shop/index', {
            pageTitle: 'Shop',
            products,
            path: '/',
            currentPage: page,
            previousPage: page-1,
            nextPage: page + 1,
            hasPreviousPage: page > 1 ,
            hasNextPage: page+1 < Math.ceil(totalItems/PAGE_LIMIT),
            lastPage: Math.ceil(totalItems/PAGE_LIMIT)
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-details', {
                product,
                pageTitle: 'Product Details',
                path: '/products',
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
}

exports.postCart = (req, res, next) => {
    const productId = req.body.productId;
    Product.findById(productId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(() => {
            res.redirect('/products')
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then((user) => {
            const cart = user.cart.items
            res.render('shop/cart', {
                pageTitle: 'Your Cart',
                path: '/cart',
                products: cart,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.getProductList = (req, res, next) => {
    const PAGE_LIMIT = 3
    const page = +req.query.page || 1;
    let totalItems;
    Product
    .find()
    .countDocuments()
    .then(totalProducts => {
        totalItems = totalProducts;
        return Product.find().skip((page-1)*PAGE_LIMIT).limit(PAGE_LIMIT)
    })
    .then(products => {
        res.render('shop/product-list', {
            pageTitle: 'Product List',
            products,
            path: '/products',
            currentPage: page,
            previousPage: page-1,
            nextPage: page + 1,
            hasPreviousPage: page > 1 ,
            hasNextPage: page+1 < Math.ceil(totalItems/PAGE_LIMIT),
            lastPage: Math.ceil(totalItems/PAGE_LIMIT)
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};

exports.deleteCartItem = (req, res, next) => {
    const prodId = req.body.productId;
    req.user.deleteFromCart(prodId)
        .then(() => {
            res.redirect('/cart')
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
}

exports.getCheckout = (req,res,next) => {
    let products;
    let total = 0;
    req.user
        .populate('cart.items.productId')
        .then(user => {
            
            products = user.cart.items.map(cartItem => {
                return {
                    product: { ...cartItem.productId._doc },
                    quantity: cartItem.quantity
                }
            })

            products.forEach(p=>{
                total += p.quantity * p.product.price
            })
            return stripe.checkout.sessions.create({
                line_items: products.map(p=>{
                    return {
                        name: p.product.title,
                        description: p.product.description,
                        amount : p.product.price * 100,
                        currency: 'inr',
                        quantity: p.quantity,
                    }
                }),
                payment_method_types: [
                  'card',
                ],
                mode: 'payment',
                success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
                cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
              });
        })
        .then(session => {
            res.render('checkout/checkout', {
                path: '/checkout',
                pageTitle: 'checkout',
                sessionId: session.id,
                total,
                products,
                stripePrimaryKey: process.env.STRIPE_PRIMARY,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })

}

exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const cartData = user.cart.items.map(cartItem => {
                return {
                    product: { ...cartItem.productId._doc },
                    quantity: cartItem.quantity
                }
            })
            const order = new Order({
                items: cartData,
                user: {
                    userId: req.user,
                    userName: req.user.userName
                }
            })
            return order.save();
        })
        .then(() => {
            return req.user.clearCart()
        })
        .then(result => {
            res.redirect('/order')
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
}


exports.postOrder = (req, res,next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const cartData = user.cart.items.map(cartItem => {
                return {
                    product: { ...cartItem.productId._doc },
                    quantity: cartItem.quantity
                }
            })
            const order = new Order({
                items: cartData,
                user: {
                    userId: req.user,
                    userName: req.user.userName
                }
            })
            return order.save();
        })
        .then(() => {
            return req.user.clearCart()
        })
        .then(result => {
            res.redirect('/order')
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
}

exports.getOrder = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
    .then((orders) => {
        res.render('shop/order', {
            orders,
            path: '/order',
            pageTitle: 'Orders',
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
}

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    const invoiceName = `Invoice-${orderId}.pdf`;
    const invoicePath = path.join('data', 'invoices', invoiceName);

    Order.findById(orderId)
    .then(order => {
        if (!order) {
            return next(new Error('Order Not Found'));
        }
        if (order.user.userId.toString() != req.user._id.toString()) {
            return next(new Error('Unauthorized!'));
        }

        let invoice = {
            id:orderId,
            name:order.user.userName,
            items:[],
            total:0
        };
        
        order.items.forEach(prod => {
            invoice.items.push({
                title: prod.product.title,
                price: prod.product.price,
                qty: prod.quantity,
            })
            invoice.total += prod.product.price * prod.quantity
        })
        
        res.setHeader('Content-Type','application/pdf')
        res.setHeader('Content-disposition', 'inline; filename='+ invoiceName +'.pdf');
        let doc = new Pdf({ size: "A4", margin: 50 });
        doc.pipe(fs.createWriteStream(invoicePath));
        doc.pipe(res)
        
        pdf.createInvoice(doc,invoice,invoicePath)
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })

}


