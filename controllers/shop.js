const path = require("path");
const fs = require("fs");

const stripe = require("stripe")(`${process.env.STRIPE_SECRET}`);
const Pdf = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");
const pdf = require("../models/pdf");

exports.getIndex = async (req, res, next) => {
  const PAGE_LIMIT = 3;
  const page = +req.query.page || 1;

  try {
    const totalItems = await Product.find().countDocuments();
    const products = await Product.find()
      .skip((page - 1) * PAGE_LIMIT)
      .limit(PAGE_LIMIT);

    res.render("shop/index", {
      pageTitle: "Shop",
      products,
      path: "/",
      currentPage: page,
      previousPage: page - 1,
      nextPage: page + 1,
      hasPreviousPage: page > 1,
      hasNextPage: page + 1 < Math.ceil(totalItems / PAGE_LIMIT),
      lastPage: Math.ceil(totalItems / PAGE_LIMIT),
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
    const product = await Product.findById(prodId);
    res.render("shop/product-details", {
      product,
      pageTitle: "Product Details",
      path: "/products",
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCart = async (req, res, next) => {
  const productId = req.body.productId;
  try {
    const product = await Product.findById(productId);
    await req.user.addToCart(product);
    res.redirect("/products");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const cart = user.cart.items;
    res.render("shop/cart", {
      pageTitle: "Your Cart",
      path: "/cart",
      products: cart,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProductList = async (req, res, next) => {
  const PAGE_LIMIT = 3;
  const page = +req.query.page || 1;
  try {
    const totalItems = await Product.find().countDocuments();
    const products = await Product.find()
      .skip((page - 1) * PAGE_LIMIT)
      .limit(PAGE_LIMIT);
    res.render("shop/product-list", {
      pageTitle: "Product List",
      products,
      path: "/products",
      currentPage: page,
      previousPage: page - 1,
      nextPage: page + 1,
      hasPreviousPage: page > 1,
      hasNextPage: page + 1 < Math.ceil(totalItems / PAGE_LIMIT),
      lastPage: Math.ceil(totalItems / PAGE_LIMIT),
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.deleteCartItem = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    await req.user.deleteFromCart(prodId);
    res.redirect("/cart");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCheckout = async (req, res, next) => {
  let products;
  let total = 0;

  try {
    const user = await req.user.populate("cart.items.productId");
    products = user.cart.items.map((cartItem) => {
      return {
        product: { ...cartItem.productId._doc },
        quantity: cartItem.quantity,
      };
    });

    products.forEach((p) => {
      total += p.quantity * p.product.price;
    });
    const session = await stripe.checkout.sessions.create({
      line_items: products.map((p) => {
        return {
          name: p.product.title,
          description: p.product.description,
          amount: p.product.price * 100,
          currency: "inr",
          quantity: p.quantity,
        };
      }),
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${req.protocol}://${req.get("host")}/checkout/success`,
      cancel_url: `${req.protocol}://${req.get("host")}/checkout/cancel`,
    });
    res.render("checkout/checkout", {
      path: "/checkout",
      pageTitle: "checkout",
      sessionId: session.id,
      total,
      products,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCheckoutSuccess = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const cartData = user.cart.items.map((cartItem) => {
      return {
        product: { ...cartItem.productId._doc },
        quantity: cartItem.quantity,
      };
    });
    const order = new Order({
      items: cartData,
      user: {
        userId: req.user,
        userName: req.user.userName,
      },
    });
    await order.save();
    await req.user.clearCart();
    res.redirect("/order");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postOrder = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const cartData = user.cart.items.map((cartItem) => {
      return {
        product: { ...cartItem.productId._doc },
        quantity: cartItem.quantity,
      };
    });
    const order = new Order({
      items: cartData,
      user: {
        userId: req.user,
        userName: req.user.userName,
      },
    });
    await order.save();
    await req.user.clearCart();
    res.redirect("/order");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.user._id });

    res.render("shop/order", {
      orders,
      path: "/order",
      pageTitle: "Orders",
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = `Invoice-${orderId}.pdf`;
  const invoicePath = path.join("data", "invoices", invoiceName);
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return next(new Error("Order Not Found"));
    }
    if (order.user.userId.toString() != req.user._id.toString()) {
      return next(new Error("Unauthorized!"));
    }

    let invoice = {
      id: orderId,
      name: order.user.userName,
      items: [],
      total: 0,
    };

    order.items.forEach((prod) => {
      invoice.items.push({
        title: prod.product.title,
        price: prod.product.price,
        qty: prod.quantity,
      });
      invoice.total += prod.product.price * prod.quantity;
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-disposition",
      "inline; filename=" + invoiceName + ".pdf"
    );
    let doc = new Pdf({ size: "A4", margin: 50 });
    doc.pipe(fs.createWriteStream(invoicePath));
    doc.pipe(res);

    pdf.createInvoice(doc, invoice, invoicePath);
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};
