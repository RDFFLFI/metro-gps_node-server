const express = require("express");
const router = express.Router();

const tripLiveController = require("../../controllers/live/trip-live");
const tripPullOutController = require("../../controllers/live/trip-pull-out");
const tripPullOthersController = require("../../controllers/live/trip-others");
const isAuth = require("../../middleware/is-auth");

router.get("/apk-trips-live", isAuth, tripLiveController.getApkTripLive);

//old get trips live
router.get("/trips-live", isAuth, tripLiveController.getTripLive);

//new get trips live
router.get("/fetch-trips-live", isAuth, tripLiveController.fetchTripLive);

router.post("/trip-live", isAuth, tripLiveController.createApkTripLive);
router.put("/trip-live/:tripId", isAuth, tripLiveController.updateTripLive);

//routes of pull out 
router.get("/fetch-trips-pull-out", isAuth, tripPullOutController.fetchTripPullOut);

router.post("/trip-pull-out", isAuth, tripPullOutController.createApkTripPullOut);

router.put("/trip-pull-out/:tripId", isAuth, tripPullOutController.updateTripPullOut);


//routes of others
router.get("/fetch-trips-others", isAuth, tripPullOthersController.fetchTripOthers);

router.post("/trip-others", isAuth, tripPullOthersController.createApkTripOthers);

router.put("/trip-others/:tripId", isAuth, tripPullOthersController.updateTripOthers);

module.exports = router;
