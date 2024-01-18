const express = require("express");
const { body } = require("express-validator");
const User = require("../models/user");

const router = express.Router();

const authController = require("../controllers/auth");
const isAuth = require("../middleware/is-auth");

router.post(
  "/create-user",
  [  body("employee_id").custom(async (value) => {
        const user = await User.findOne({ employee_id: value });
        if (user) {
          return Promise.reject("Employee ID already exists");
        }
      }),
    body("username").custom(async (value) => {
      return await User.findOne({ username: value }).then((user) => {
        if (user) {
          return Promise.reject("Username already exist");
        }
      });
    }),
    body("password")
      .trim()
      .isLength({ min: 5 })
      .withMessage("Password minimum length is 5"),
  ],
  isAuth,
  authController.createUser
);

router.post("/login", authController.login);
router.get("/users", isAuth, authController.getUsers);
router.delete("/delete-user/:userId", isAuth, authController.deleteUser);
router.put(
  "/update-user/:userId",
  [
    body("employee_id").custom(async (value, { req }) => {
      const existingUser = await User.findOne({
        employee_id: value,
        _id: { $ne: req.params.userId } // Exclude the current user's ID
      });
      
      if (existingUser) {
        return Promise.reject("Employee ID already exists");
      }
    }),
    body("username").custom(async (value) => {
      return await User.findOne({ username: value }).then((user) => {
        if (user?.length > 1) {
          return Promise.reject("Username already exist");
        }
      });
    }),
  ],
  isAuth,
  authController.updateUser
);
router.post("/import-users", isAuth, authController.importUsers);
router.delete("/delete-all-users", isAuth, authController.deleteAllUsers);

module.exports = router;
