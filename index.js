require("dotenv").config();

// Inbuilt modules
const path = require("path");

// Imported modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDbStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

// Helper variables
const app = express();
const config = process.env;
const PORT = config.PORT || 7030;
const MONGO_URI = config.MONGO_URI;

const store = new MongoDbStore({
  uri: MONGO_URI,
  collection: "sessions",
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join("images"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname.toUpperCase()}${new Date()
        .toDateString()
        .split(" ")
        .join("")
        .toUpperCase()}-${file.originalname.split(" ").join("")}`
    );
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype == "image/jpeg" || file.mimetype == "image/png") {
    cb(null, true);
  } else {
    req.fileErr = "Only JPEG or PNG";
    cb(null, false, new Error("Only JPEG or PNG"));
  }
};

// View-Engine
app.set("view engine", "ejs");
app.set("views", "views");

// middlewares
app.use(express.static("public"));
app.use("/images", express.static("images"));
// body-parsing
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
// multer
app.use(
  multer({
    storage,
    fileFilter,
  }).single("img")
);
// sessions
app.use(
  session({
    secret: `${config.SECRET_KEY}`,
    resave: false, // session wont be save on every request
    saveUninitialized: false,
    store,
  })
);
// csrf
app.use(csrf());
// flash-errors
app.use(flash());
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});
// routes
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const errorController = require("./controllers/error");
// user model
const User = require("./models/user");

// optimiztion
// app.use(helmet());

// handling incoming req
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// errorhandling
app.get("/500", errorController.get500Error);
app.get("/link-sent", errorController.getLinkSent);
app.use(errorController.getError);

app.use((error, req, res, next) => {
  console.log(error);
  res.status(500).render("500", {
    pageTitle: "Error 500",
    path: "",
    isLoggedIn: req.session.isLoggedIn,
  });
});

// Server
mongoose
  .connect(MONGO_URI)
  .then((result) => {
    console.log("DB Connected!");
    console.log("Server Running!");
    app.listen(PORT);
  })
  .catch((err) => {
    console.log(err);
  });
