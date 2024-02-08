const { validationResult } = require("express-validator");
const ApkManagement = require("../models/apk_management");
const path = require("path");
const fs = require("fs");

exports.createApkManagement = async (req, res, next) => {
  try {
    let newApkURL;

    if (req.file) {
      newApkURL = req.file.path.replace("\\", "/");
    }

    const version_name = req.body.version_name;
    const release_date = req.body.release_date;
    const apk_path = newApkURL;

    const totalApk = await ApkManagement.countDocuments();

    if (totalApk > 0) {
      res.status(401).json({
        message: "Please update the existing apk",
      });
      return;
    }

    const apkManagement = new ApkManagement({
      version_name: version_name,
      release_date: release_date,
      apk_file_path: apk_path,
    });

    const result = await apkManagement.save();

    res.status(201).json({
      message: "Success create APK",
      data: result,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};



  exports.updateApkManagement = async (req, res, next) => {
    try {
      if (req.role !== "admin") {
        const error = new Error("Please make sure you're an admin");
        error.statusCode = 403; // 403 for forbidden
        throw error;
      }
  
      let newApkURL;
  
      if (req.file) {
        newApkURL = req.file.path.replace("\\", "/");
      }
  
      const version_name = req.body.version_name;
      const release_date = req.body.release_date;
      const apk_path = newApkURL;
      const apkId = req.params.apkId;
  
      const apk = await ApkManagement.findById(apkId);
  
      if (!apk) {
        const error = new Error("Could not find apk");
        error.statusCode = 404; // 404 for not found
        throw error;
      }
  
      apk.version_name = version_name;
      apk.release_date = release_date;
      apk.apk_file_path = apk_path;
  
      const result = await apk.save();
  
      res.status(200).json({
        message: "Success update apk",
        data: result,
      });
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  };
  


  exports.getApkManagement = (req, res, next) => {
    let totalItems;
  
    ApkManagement.find()
      .then((result) => {
        res.status(200).json({
          message: "Fetch Apk successfully",
          data: result,
        });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  };