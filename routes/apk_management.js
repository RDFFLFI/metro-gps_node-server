const express = require("express");
const router = express.Router();
const ApkManagement = require("../controllers/apk_management");
const isAuth = require("../middleware/is-auth");

router.get("/apk-management", isAuth, ApkManagement.getApkManagement);
router.post("/apk-management", isAuth, ApkManagement.createApkManagement);
router.put("/apk-management/:apkId", isAuth, ApkManagement.updateApkManagement);

module.exports = router;
