const fs = require("fs");
const Product = require("../models/product");
const fileHelper = require("../utils/file");
const { validationResult } = require("express-validator");

const User = require("../models/user");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editMode: false,
    isError: false,
    errs: { titleErr: null, imgErr: null, descriErr: null, priceErr: null },
  });
};

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const img = req.file;
  const description = req.body.description;
  const price = +req.body.price;
  const error = validationResult(req);

  if (!error.isEmpty() || !img) {
    const titleErr = error.mapped().title ? error.mapped().title.msg : null;
    const imgErr = !img ? "Only JPEG or PNG" : null;
    const descriErr = error.mapped().description
      ? error.mapped().description.msg
      : null;
    const priceErr = error.mapped().price ? error.mapped().price.msg : null;

    let errs = { titleErr, imgErr, descriErr, priceErr };

    return res.status(400).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editMode: false,
      errs,
      isError: true,
      product: {
        title,
        img,
        description,
        price,
      },
    });
  }
  try {
    const product = new Product({
      title,
      img: img.path,
      description,
      price,
      userId: req.user,
    });
    await product.save();
    res.redirect("/admin/products");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  const PAGE_LIMIT = 3;
  const page = +req.query.page || 1;

  try {
    const totalItems = await Product.find({
      userId: req.user._id,
    }).countDocuments();

    const products = await Product.find({ userId: req.user._id })
      .skip((page - 1) * PAGE_LIMIT)
      .limit(PAGE_LIMIT);
    res.render("admin/products", {
      pageTitle: "Admin Products",
      products,
      path: "/admin/products",
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

exports.getEditProduct = async (req, res, next) => {
  const edit = req.query.edit;
  const editMode = edit == "true";

  if (!editMode) {
    res.redirect("/add-product");
  }

  const prodId = req.params.productId;

  try {
    const product = await Product.findById(prodId);
    if (!product) {
      res.redirect("/");
    } else {
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editMode: editMode,
        isError: false,
        product,
        errs: { titleErr: null, imgErr: null, descriErr: null, priceErr: null },
      });
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postEditProduct = async (req, res, next) => {
  const title = req.body.title;
  const img = req.file;
  const description = req.body.description;
  const price = +req.body.price;
  const prodId = req.body.productId;

  const error = validationResult(req);

  if (!error.isEmpty()) {
    const titleErr = error.mapped().title ? error.mapped().title.msg : null;
    const imgErr = req.fileErr ? req.fileErr : null;
    const descriErr = error.mapped().description
      ? error.mapped().description.msg
      : null;
    const priceErr = error.mapped().price ? error.mapped().price.msg : null;

    let errs = { titleErr, imgErr, descriErr, priceErr };

    return res.status(400).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editMode: true,
      errs,
      isError: true,
      product: {
        title,
        description,
        price,
        _id: prodId,
      },
    });
  }
  try {
    const product = await Product.findById(prodId);

    if (product.userId.toString() != req.user._id.toString()) {
      return res.redirect("/admin/products");
    }

    if (req.fileErr) {
      const titleErr = null;
      const imgErr = req.fileErr ? req.fileErr : null;
      const descriErr = null;
      const priceErr = null;

      let errs = { titleErr, imgErr, descriErr, priceErr };

      return res.status(400).render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/add-product",
        editMode: true,
        errs,
        isError: true,
        product,
      });
    }
    if (img) {
      if (fs.existsSync(product.img)) {
        fileHelper.deleteImg(product.img, next);
      }
      product.img = img.path;
    }
    product.title = title;
    product.description = description;
    product.price = price;
    await product.save();
    res.redirect("/admin/products");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
    const product = await Product.findById(prodId);
    if (!product) {
      return next(new Error("Product Not Found!"));
    }
    if (fs.existsSync(product.img)) {
      fileHelper.deleteImg(product.img, next);
    }

    await req.user.deleteProduct(prodId);
    await Product.deleteOne({
      _id: prodId,
      userId: req.user._id,
    });
    1;
    res.status(200).json({ message: "Success!" });
  } catch (err) {
    res.status(500).json({ message: "Failed!" });
  }
};
