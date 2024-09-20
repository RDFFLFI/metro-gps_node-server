const express = require("express");
const router = express.Router();

const tripLiveController = require("../../controllers/live/trip-live");
const tripPullOutController = require("../../controllers/live/trip-pull-out");
const isAuth = require("../../middleware/is-auth");

router.get("/apk-trips-live", isAuth, tripLiveController.getApkTripLive);

//old get trips live
router.get("/trips-live", isAuth, tripLiveController.getTripLive);

//new get trips live
router.get("/fetch-trips-live", isAuth, tripLiveController.fetchTripLive);

router.post("/trip-live", isAuth, tripLiveController.createApkTripLive);

router.put("/trip-live/:tripId", isAuth, tripLiveController.updateTripLive);

//routes of pull out 
//new get trips live
router.get("/fetch-trips-pull-out", isAuth, tripPullOutController.fetchTripPullOut);

router.post("/trip-pull-out", isAuth, tripPullOutController.createApkTripPullOut);

router.put("/trip-pull-out/:tripId", isAuth, tripPullOutController.updateTripPullOut);

module.exports = router;
