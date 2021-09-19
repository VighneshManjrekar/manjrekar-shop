const bcrypt = require("bcryptjs");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const sgTransport =  require('@sendgrid/mail');
const crypto = require("crypto");
const { validationResult } = require("express-validator");
sgTransport.setApiKey(`${process.env.SENDGRID_PASS}`)

// const SENDGRID_PASS = ;
// const options = {
//   auth: {
//     api_key: SENDGRID_PASS,
//   },
// };
// await sgTransport = nodemailer.createTransport(sgTransport(options));

exports.postSignUp = async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const userName = req.body.userName;
  const password = req.body.password;
  const error = validationResult(req);

  const userNameErr =
    error.mapped().userName != undefined ? error.mapped().userName.msg : null;
  const emailErr =
    error.mapped().email != undefined ? error.mapped().email.msg : null;
  const passwordErr =
    error.mapped().password != undefined ? error.mapped().password.msg : null;

  if (!error.isEmpty()) {
    let errs = {
      userNameErr,
      emailErr,
      passwordErr,
    };

    return res.status(400).render("auth/sign-up", {
      path: "/sign-up",
      pageTitle: "Sign Up",
      message: errs,
      oldInput: {
        email,
        userName,
        password,
      },
    });
  }

  try {
    const hashedPass = await bcrypt.hash(password, 12);
    const user = new User({
      userName,
      email: email,
      password: hashedPass,
      cart: { items: [] },
    });
    await user.save();
    res.redirect("/sign-in");
    await sgTransport.send({
      to: email,
      from: `${process.env.MAIL_ID}`,
      subject: "Registration Successful",
      html: `<h1>Hello ${userName}!!<br> You are successfully registered!!</h1>`,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getSignUp = (req, res, next) => {
  res.render("auth/sign-up", {
    path: "/sign-up",
    pageTitle: "Sign Up",
    message: req.flash("invalidEmail"),
    oldInput: {
      email: "",
      userName: "",
      password: "",
    },
  });
};

exports.postSignIn = async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const password = req.body.password;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("auth/sign-in", {
        path: "/sign-up",
        pageTitle: "Sign Up",
        emailErr: "No user was found with this Email",
        passwordErr: "",
        oldInput: {
          email,
          password,
        },
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.isLoggedIn = true;
      req.session.user = user;
      res.redirect("/");
      await sgTransport.send({
        to: email,
        from: `${process.env.MAIL_ID}`,
        subject: "Login Successful",
        html: `<h1>${user.userName} Welcome to node shop!!</h1>`,
      });
    } else {
      return res.status(400).render("auth/sign-in", {
        path: "/sign-up",
        pageTitle: "Sign Up",
        emailErr: "",
        passwordErr: "Invalid Email or Password!",
        oldInput: {
          email,
          password,
        },
      });
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getSignIn = (req, res, next) => {
  res.render("auth/sign-in", {
    path: "/sign-up",
    pageTitle: "Sign In",
    message: req.flash("invalidPass"),
    emailErr: "",
    passwordErr: "",
    oldInput: {
      email: "",
      password: "",
    },
  });
};

exports.postLogOut = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

exports.getReset = (req, res) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    message: req.flash("invalidEmail"),
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");

    try {
      const user = await User.findOne({ email: req.body.email.toLowerCase() });
      if (!user) {
        req.flash("invalidEmail", "Invalid Email");
        return res.redirect("/reset");
      }
      user.resetToken = token;
      user.resetTokenExpiry = Date.now() + 1000 * 60 * 60;
      await user.save();

      res.redirect("/link-sent");
      await sgTransport.send({
        to: req.body.email.toLowerCase(),
        from: `${process.env.MAIL_ID}`,
        subject: "Reset Password",
        html: `<p>You requested password reset.</p><p>Click this <a href="https://manjrekar-shop.herokuapp.com/reset/${token}">link</a> to reset the password</p>`,
      });
      // return true
    } catch (err) {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    }
  });
};

exports.getNewPassword = async (req, res, next) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "Reset Password",
      message: req.flash("invalidEmail"),
      userId: user._id,
      passwordToken: token,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postNewPassword = async (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const token = req.body.passwordToken;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
      _id: userId,
    });
    const hashedPass = await bcrypt.hash(newPassword, 12);
    user.password = hashedPass;
    user.resetToken = null;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.redirect("/sign-in");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};
