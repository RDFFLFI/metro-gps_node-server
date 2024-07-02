const express = require("express");

const router = express.Router();
const RouteController = require("../controllers/route");
const isAuth = require("../middleware/is-auth");

router.get("", isAuth, RouteController.getRoutes);
router.post("/create-route", isAuth, RouteController.createRoute);
router.put("/update-route/:routesId", isAuth, RouteController.updateRoute);
// router.delete(
//   "/routes/:routesId",
//   isAuth,
//   RouteController.deleteRoutes
// );

router.post("/import-routes", isAuth, RouteController.importRoutes);
// router.delete(
//   "/delete-all-routes",
//   isAuth,
//   RouteController.deleteAllRoutess
// );

module.exports = router;
