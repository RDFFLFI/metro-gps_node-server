const TripHauling = require("../../models/depot/hauling/trip-hauling");
const Location = require("../../models/depot/hauling/location");
const Diesel = require("../../models/depot/hauling/diesel");

exports.createApkTripHauling = (req, res, next) => {
  let odometer_image_path;
  let odometer_done_image_path;

  if (req.files.length >= 2) {
    odometer_image_path = req.files[0].path.replace("\\", "/");
    odometer_done_image_path = req.files[1].path.replace("\\", "/");
  }

  const {
    trip_date,
    trip_type,
    trip_category,
    destination,
    vehicle_id,
    odometer,
    odometer_done,
    companion,
    others,
    points,
    charging,
    tare_weight,
    gross_weight,
    net_weight,
    doa_count,
    item_count,
  } = req.body;

  const tripObj = {
    user_id: req.userId,
    trip_date: trip_date || new Date(),
    trip_category: trip_category,
    trip_type: trip_type,
    destination: destination,
    vehicle_id: vehicle_id,
    odometer: odometer,
    odometer_done: odometer_done || null,
    odometer_image_path: odometer_image_path || null,
    odometer_done_image_path: odometer_done_image_path || null,
    companion: JSON.parse(companion) || [],
    others: others || "",
    points: (points && JSON.parse(points)) || [],
    charging: charging || null,
    tare_weight: tare_weight || null,
    gross_weight: gross_weight || null,
    net_weight: net_weight || null,
    doa_count: doa_count || null,
    item_count: item_count || null,
  };

  let trip_id;

  TripHauling.create(tripObj)
    .then(async (result) => {
      trip_id = result._id;

      const locationsPromises = (JSON.parse(req.body.locations) || []).map(
        async (location) => {
          return await Location.create({ trip_id: trip_id, ...location }).then(
            (result) => {
              return result._id;
            }
          );
        }
      );

      const dieselsPromises = (JSON.parse(req.body.diesels) || []).map(
        async (diesel) => {
          return await Diesel.create({ trip_id: trip_id, ...diesel }).then(
            (result) => {
              return result._id;
            }
          );
        }
      );

      const [locationsIds, dieselsIds] = await Promise.all([
        Promise.all(locationsPromises),
        Promise.all(dieselsPromises),
      ]);

      return { locationsIds, dieselsIds };
    })
    .then(async (result) => {
      const trip = await TripHauling.findOneAndUpdate(
        { _id: trip_id },
        {
          $push: { diesels: result.dieselsIds, locations: result.locationsIds },
        },
        { new: true }
      )
        .populate({
          path: "locations",
          options: { sort: { date: 1 } },
        })
        .populate("diesels")
        .populate("user_id", {
          employee_id: 1,
          first_name: 2,
          last_name: 3,
          department: 4,
        })
        .populate("vehicle_id", { plate_no: 1, name: 2 });

      res
        .status(201)
        .json({ message: "Done creating apk hauling trip", data: trip });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getApkTripHauling = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = req.query.limit || 25;
  const dateItem = req.query.date;

  const filter =
    dateItem !== "null"
      ? {
          user_id: req.userId,
          ["trip_date"]: {
            $gte: `${dateItem}T00:00:00`,
            $lte: `${dateItem}T23:59:59`,
          },
        }
      : { user_id: req.userId };

  TripHauling.find(filter)
    .populate({
      path: "locations",
      options: { sort: { date: 1 } },
    })
    .populate("diesels")
    .populate("user_id", {
      employee_id: 1,
      first_name: 2,
      last_name: 3,
      department: 4,
      trip_template: 5,
    })
    .populate("vehicle_id", { plate_no: 1, name: 2 })
    .sort({ createdAt: "desc" })
    .skip((currentPage - 1) * perPage)
    .limit(perPage)
    .then((result) => {
      res.status(200).json({
        message: "Success get apk hauling trips",
        data: result,
        pagination: {
          totalItems: result.length,
          currentPage: parseInt(currentPage),
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};


//old get trip hauling trips
exports.getTripHauling = (req, res, next) => {
  const query = req.query;
  const currentPage = query.page || 1;
  const perPage = query.limit || 25;
  let searchItem = query.search || "";
  const searchBy = query.searchBy || "_id";
  const dateItem = query.date;
  const userDepartment = req?.department;
  const show_all_departments = req?.show_all_departments;

  const filter =
    searchBy === "trip_date" || searchBy === "createdAt"
      ? {
          [searchBy]: {
            $gte: `${dateItem}T00:00:00`,
            $lte: `${dateItem}T23:59:59`,
          },
        }
      : {};

  TripHauling.find(filter)
    .populate({
      path: "locations",
      options: { sort: { date: 1 } },
    })
    .populate("diesels")
    .populate("user_id", {
      employee_id: 1,
      first_name: 2,
      last_name: 3,
      department: 4,
    })
    .populate("vehicle_id", { plate_no: 1 })
    .sort({ createdAt: "desc" })
    .then((trips) => {
      const newTrip = trips.filter((trip) => {
        if (show_all_departments) {
          return trip;
        } else {
          return trip?.user_id?.department.toString().includes(userDepartment);
        }
      });

      if (searchBy === "trip_date" || searchBy === "createdAt") {
        return newTrip;
      } else {
        return newTrip.filter((trip) => {
          searchItem = searchItem.toLowerCase();
          const searchProps = searchBy.split(".");
          let obj = trip;

          for (const prop of searchProps) {
            obj = obj[prop];

            if (Array.isArray(obj)) {
              if (prop === "companion") {
                return obj.find((el) =>
                  el.first_name.toString().toLowerCase().includes(searchItem)
                );
              }

              return obj.find(
                (el) => el && el.toString().toLowerCase().includes(searchItem)
              );
            }

            if (!obj) return false;
          }

          return obj.toString().toLowerCase().includes(searchItem);
        });
      }
    })
    .then((result) => {
      res.status(200).json({
        message: "Success get hauling trips",
        data:
          perPage <= 0 || perPage === "undefined"
            ? result
            : result.slice(
                (currentPage - 1) * perPage,
                parseInt((currentPage - 1) * perPage) + parseInt(perPage)
              ),
        pagination: {
          totalItems: result.length,
          limit: parseInt(perPage),
          currentPage: parseInt(currentPage),
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};


// new get trip hauling trips
// exports.fetchTripHauling = async (req, res, next) => {
//   const { page, limit } = req?.query;

//   try {
//     let pageNumber = parseInt(page) || 1;
//     let itemsPerPage = parseInt(limit) || 0;

//     const skipValue = (pageNumber - 1) * itemsPerPage;
//     let searchItem = req.query.search || "";
//     const searchBy = req.query.searchBy || "_id";
//     const userDepartment = req?.department;
//     const show_all_departments = req?.show_all_departments;
//     const dateFrom = req.query.dateFrom;
//     const dateTo = req.query.dateTo;
    
//     let totalItems;

//     let filter =
//       searchBy === "trip_date" || searchBy === "createdAt"
//         ? {
//             [searchBy]: {
//               $gte: `${dateFrom}T00:00:00`,
//               $lte: `${dateTo}T23:59:59`,
//             },
//           }
//         : {};
        
//     if (searchBy === "trip_date") {
//       sort = { trip_date: "asc" };
//     }
//     else if (searchBy === "createdAt") {
//       sort = { createdAt: "asc" };
//     }else{
//       sort = { createdAt: "desc" };
//     }

//     const all_trips = await TripHauling.find(filter)
//       .populate({
//         path: "locations",
//         options: { sort: { date: 1 } },
//       })
//       .populate("diesels")
//       .populate("user_id", {
//         employee_id: 1,
//         first_name: 2,
//         last_name: 3,
//         department: 4,
//       })
//       .populate("vehicle_id", { plate_no: 1 })
//       .sort(sort)
//       .skip(skipValue)
//       .limit(itemsPerPage);

//     // Apply additional filtering based on searchBy and searchItem
//     const filteredTrips = all_trips.filter((trip) => {
//       searchItem = searchItem.toLowerCase();
//       const searchProps = searchBy.split(".");
//       let obj = trip;
//       for (const prop of searchProps) {
//         obj = obj[prop];
//         if (Array.isArray(obj)) {
//           if (prop === "companion") {
//             return obj.find((el) =>
//               el.first_name
//                 .toString()
//                 .toLowerCase()
//                 .includes(searchItem)
//             );
//           }
//           return obj.find(
//             (el) =>
//               el && el.toString().toLowerCase().includes(searchItem)
//           );
//         }
//         if (!obj) return false;
//       }
//       return obj.toString().toLowerCase().includes(searchItem);
//     });


//     if (searchItem != null && searchItem !== "") {
//       totalItems = filteredTrips.length;
//     } else {
//       totalItems = await TripHauling.countDocuments(filter);
//     }


//     const result = {
//       message: "Success get hauling trips",
//       data: filteredTrips,
//       pagination:{
//         totalItems: totalItems,
//         limit: itemsPerPage,
//         currentPage: pageNumber,
//       },
//       previous_page:
//         pageNumber > 1 && filteredTrips?.length ? pageNumber - 1 : null,
//       next_page:
//         itemsPerPage < totalItems && filteredTrips?.length ? pageNumber + 1 : null,
//     };

//     res.status(200).json(result);
//     return next();
//   } catch (error) {
//     // Handle the error appropriately
//     res.status(500).json({ error: "Internal Server Error" });
//     return next(error);
//   }
// };


exports.fetchTripHauling = async (req, res, next) => {
  const {
    page,
    limit,
    search = "",
    searchBy = "_id",
  } = req.query;

  let {
    dateFrom,
    dateTo,
  } = req.query;
  

  try {
    let pageNumber = parseInt(page) || 1;
    let itemsPerPage = parseInt(limit) || 0; // Set to 0 for no limit
    const skipValue = (pageNumber - 1) * itemsPerPage;

    const pipeline = [];
    let filter = {};

    // Lookup related documents first
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_id",
          pipeline: [
            { $project: { _id: 1, employee_id: 1, first_name: 1, last_name: 1, department: 1 } }
          ]
        }
      },
      {
        $unwind: { path: "$user_id", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicle_id",
          foreignField: "_id",
          as: "vehicle_id",
          pipeline: [
            { $project: { _id: 1, plate_no: 1, name: 1 } }
          ]
        }
      },
      {
        $unwind: { path: "$vehicle_id", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "locationhaulings",
          localField: "locations",
          foreignField: "_id",
          as: "locations",
        },
      },
      {
        $lookup: {
          from: "dieselhaulings",
          localField: "diesels",
          foreignField: "_id",
          as: "diesels",
        },
      }
    );

    // Constructing filter based on search criteria
    if (search) {
      const searchTerm = search.trim(); // Case-insensitive regex
      const isNumericSearch = !isNaN(searchTerm);

      if (searchBy === "user_id.employee_id" || searchBy === "user_id.department") {
        filter[`user_id.${searchBy.split('.').pop()}`] = { $regex: searchTerm };
      } else if (searchBy === "vehicle_id.plate_no") {
        filter["vehicle_id.plate_no"] = { $regex: searchTerm };
      } else if (searchBy === "diesels.gas_station_name") {
        filter["diesels.gas_station_name"] = { $regex: searchTerm };
      } else if (searchBy === "companion.first_name") {
        filter["companion.first_name"] = { $regex: searchTerm };
      }else if (searchBy === "odometer" && isNumericSearch) {
        filter["odometer"] = parseInt(searchTerm, 10); 
      } else if (searchBy === "odometer_done" && isNumericSearch) {
        filter["odometer_done"] = parseInt(searchTerm, 10); 
      } else if (searchBy === "_id") {
        try {
          const objectId = ObjectId(search.trim());
          filter[searchBy] = objectId;
        } catch (err) {
          console.error("Invalid ObjectId:", err.message);
        }
      } else {
        filter[searchBy] = { $regex: searchTerm };
      }
    }

    // Add date filters if applicable
    if (dateFrom && dateTo) {
      // Convert date strings to proper Date objects and set time boundaries
    let dateFromObj = new Date(dateFrom).setUTCHours(0, 0, 0, 0);
    let dateToObj = new Date(dateTo).setUTCHours(23, 59, 59, 999);

    const dateFilter = {};
    
    // Check searchBy and add filters based on the provided date range
    if (searchBy === "trip_date") {
      dateFilter.trip_date = { $gte: new Date(dateFromObj), $lte: new Date(dateToObj) };
    }
    if (searchBy === "createdAt") {
      dateFilter.createdAt = { $gte: new Date(dateFromObj), $lte: new Date(dateToObj) };
    }
    
    // Merge date filters with the existing filter
    Object.assign(filter, dateFilter);
    
    console.log(filter);
  }

    // Add the $match stage now that all lookups and filters are set up
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // Sorting logic
    let sort = { createdAt: -1 }; // Default sort by createdAt descending
    if (searchBy === "trip_date") {
      sort = { trip_date: 1 }; // Ascending by trip_date
    } else if (searchBy === "createdAt") {
      sort = { createdAt: 1 }; // Ascending by createdAt
    }
    pipeline.push({ $sort: sort });

    // Count the total number of matching documents without skip/limit
    const totalItemsPipeline = [...pipeline];
    const totalCountResult = await TripHauling.aggregate([
      ...totalItemsPipeline,
      { $count: "totalItems" }
    ]);
    const totalItems = totalCountResult.length > 0 ? totalCountResult[0].totalItems : 0;

    // Pagination
    if (itemsPerPage > 0) {
      pipeline.push({ $skip: skipValue }, { $limit: itemsPerPage });
    }

    // Execute the aggregation
    const all_trips = await TripHauling.aggregate(pipeline);

    const result = {
      message: "Success get Hauling Trips",
      data: all_trips,
      pagination: {
        totalItems: totalItems,
        limit: itemsPerPage,
        currentPage: pageNumber,
      },
      previous_page: pageNumber > 1 ? pageNumber - 1 : null,
      next_page: itemsPerPage > 0 && itemsPerPage * pageNumber < totalItems ? pageNumber + 1 : null,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching trips:", error); // More specific error logging
    res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.updateTripHauling = (req, res, next) => {
  const tripId = req.params.tripId;
  const {
    odometer,
    odometer_done,
    temperature,
    tare_weight,
    net_weight,
    gross_weight,
    doa_count,
    item_count,
    charging,
  } = req.body;

  TripHauling.findById(tripId)
    .then((trip) => {
      if (!trip) {
        const error = new Error("Could not find trip");
        error.statusCode = 404;
        throw error;
      }

      return TripHauling.findOneAndUpdate(
        { _id: trip._id },
        {
          odometer: odometer || trip.odometer,
          odometer_done: odometer_done || trip.odometer_done,
          temperature: temperature || trip.temperature,
          tare_weight: tare_weight || trip.tare_weight,
          net_weight: net_weight || trip.net_weight,
          gross_weight: gross_weight || trip.gross_weight,
          doa_count: doa_count || trip.doa_count,
          item_count: item_count || trip.item_count,
          charging: charging || trip.charging,
        },
        { new: true } 
      );
    })
    .then((result) => {
      res.status(200).json({ message: "Done updating trip", data: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
