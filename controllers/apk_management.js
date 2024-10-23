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
    ApkManagement.find()
      .then((result) => {
        // Map over the result to add file size for each apk
        const apkDataWithSize = result.map((apk) => {
          // Resolve the absolute path from the root of the project
          const apkFilePath = path.resolve('./', apk.apk_file_path); // Start from root
          let fileSizeInMB = 'File not found';
          
          try {
            // Get the file size
            const stats = fs.statSync(apkFilePath);
            const fileSizeInBytes = stats.size;
            fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2) + 'MB'; // Convert to MB
          } catch (err) {
            console.error(`Error getting file size for ${apk.apk_file_path}:`, err);
          }
  
          return {
            ...apk.toObject(), // Spread existing APK data
            apk_file_size: fileSizeInMB, // Add file size
          };
        });
  
        res.status(200).json({
          message: "Fetch Apk successfully",
          data: apkDataWithSize,
        });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  };