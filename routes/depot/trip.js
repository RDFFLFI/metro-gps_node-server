const express = require("express");
const router = express.Router();

const tripHauilingController = require("../../controllers/depot/trip-hauling");
const tripDeliveryController = require("../../controllers/depot/trip-delivery");
const isAuth = require("../../middleware/is-auth");

// Hauling
router.get(
  "/apk-trips-hauling",
  isAuth,
  tripHauilingController.getApkTripHauling
);

//old get hauling trips
router.get("/trips-hauling", isAuth, tripHauilingController.getTripHauling);

//new get hauling trips

router.get("/fetch-trips-hauling", isAuth, tripHauilingController.fetchTripHauling);


router.post(
  "/trip-hauling",
  isAuth,
  tripHauilingController.createApkTripHauling
);
router.put(
  "/trip-hauling/:tripId",
  isAuth,
  tripHauilingController.updateTripHauling
);

// Delivery
// old get
router.get("/trips-delivery", isAuth, tripDeliveryController.getTripDelivery);

//new get 
router.get("/fetch-trips-delivery", isAuth, tripDeliveryController.fetchTripDelivery);


router.get(
  "/apk-trips-delivery",
  isAuth,
  tripDeliveryController.getApkTripDelivery
);
router.post(
  "/trip-delivery",
  isAuth,
  tripDeliveryController.createApkTripDelivery
);
router.put(
  "/trip-delivery/:tripId",
  isAuth,
  tripDeliveryController.updateTripDelivery
);
module.exports = router;
