const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ApkManagement = new Schema(
  {
    version_name: {
      type: String,
      required: true,
    },
    release_date: {
      type: String,
      required: true,
    },
    apk_file_path: {
      type: String,
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApkManagement", ApkManagement);
