const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParse = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config({ path: "/.env" });

const authRoutes = require("./routes/auth");
const vehicleRoutes = require("./routes/vehicle");
const gasStationRoutes = require("./routes/gas_station");
const tripApiDataRoutes = require("./routes/trip-api-data");

const officeTripRoutes = require("./routes/office/trip");
const depotTripRoutes = require("./routes/depot/trip");
const liveTripRoutes = require("./routes/live/trip");

const dashboardRoutes = require("./routes/dashboard");

const ApkManagement = require("./routes/apk_management");

const app = express();

// Images Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4());
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};


// Apk Upload
const apkstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "apk");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4());
  },
});

const apkfileFilter = (req, file, cb) => {
  if (file.mimetype === "application/vnd.android.package-archive") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// request file size
app.use(bodyParse.json({ limit: "100mb" }));
app.use(bodyParse.urlencoded({ limit: "100mb", extended: true }));

const uploadApk = multer({ storage: apkstorage, fileFilter: apkfileFilter }).single("apk");

const uploadImage = multer({ storage: storage, fileFilter: fileFilter }).single(
  "image"
);

const uploadOdometer = multer({
  storage: storage,
  fileFilter: fileFilter,
}).array("images");


app.use("/images", express.static(path.join(__dirname, "images")));

// END IMAGE UPLOAD

// Authentication
app.use("/auth", uploadImage, authRoutes);
// Vehicle
app.use("/vehicle", uploadImage, vehicleRoutes);
//  Gas Station
app.use("/gas-station", gasStationRoutes);
// Trip Template, Category , Type , Destination
app.use("/api/data", tripApiDataRoutes);

// Office Routes
app.use("/office", uploadOdometer, officeTripRoutes);

// Depot Routes
app.use("/depot", uploadOdometer, depotTripRoutes);

// Feeds Delivery Routes
app.use("/live", uploadOdometer, liveTripRoutes);

// Dashboard
app.use("/dashboard", dashboardRoutes);

// APK Routes
app.use("/apk", uploadApk, ApkManagement);

// Error Cb
app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ error: message, data: data });
});
// Database connection
mongoose
  .connect(process.env.DB_CONN)
  .then(() => app.listen(process.env.PORT || 8080))
  .catch((err) => console.log(err));
