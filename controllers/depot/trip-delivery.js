const TripDelivery = require("../../models/depot/delivery/trip-delivery");
const Location = require("../../models/depot/delivery/location");
const Diesel = require("../../models/depot/delivery/diesel");
const { ObjectId } = require('mongodb');

exports.createApkTripDelivery = (req, res, next) => {
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
    locations,
    diesels,
    odometer,
    odometer_done,
    others,
    charging,
    companion,
    points,
    temperature,
    route, // new field
    crates_transaction,
  } = req.body;

  const tripObj = {
    user_id: req.userId,
    trip_date: trip_date || new Date(),
    trip_category,
    trip_type,
    destination,
    vehicle_id,
    odometer,
    odometer_done,
    odometer_image_path: odometer_image_path || null,
    odometer_done_image_path: odometer_done_image_path || null,
    others,
    charging,
    companion: (companion && JSON.parse(companion)) || [],
    points: (points && JSON.parse(points)) || [],
    temperature,
    route, // new field
    crates_transaction:
      (crates_transaction && JSON.parse(crates_transaction)) || [],
  };

  let trip_id;

  TripDelivery.create(tripObj)
    .then(async (result) => {
      trip_id = result._id;

      const locationsPromises = JSON.parse(locations)?.map(async (location) => {
        return await Location.create({ trip_id: trip_id, ...location }).then(
          (result) => {
            return result._id;
          }
        );
      });

      const dieselsPromises = JSON.parse(diesels)?.map(async (diesel) => {
        return await Diesel.create({ trip_id: trip_id, ...diesel }).then(
          (result) => {
            return result._id;
          }
        );
      });

      const [locationsIds, dieselsIds] = await Promise.all([
        Promise.all(locationsPromises),
        Promise.all(dieselsPromises),
      ]);

      return { locationsIds, dieselsIds };
    })
    .then(async (result) => {
      const trip = await TripDelivery.findOneAndUpdate(
        { _id: trip_id },
        {
          $push: { diesels: result.dieselsIds, locations: result.locationsIds },
        },
        { new: true }
      )
        .populate("diesels")
        .populate({ path: "locations", options: { sort: { data: 1 } } })
        .populate("user_id", {
          employee_id: 1,
          first_name: 2,
          last_name: 3,
          department: 4,
        })
        .populate("vehicle_id", { plate_no: 1, name: 2 });

      res
        .status(201)
        .json({ message: "Done creating apk delivery trip", data: trip });
    })
    .catch(async (err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getApkTripDelivery = (req, res, next) => {
  const { query } = req;

  const currentPage = query.page || 1;
  const perPage = query.limit || 25;
  const dateItem = query.date;
  const userId = req.userId;

  const filter =
    dateItem !== "null"
      ? {
          user_id: userId,
          ["trip_date"]: {
            $gte: `${dateItem}T00:00:00`,
            $lte: `${dateItem}T23:59:59`,
          },
        }
      : { user_id: userId };

  TripDelivery.find(filter)
    .populate("user_id", {
      employee_id: 1,
      first_name: 2,
      last_name: 3,
      department: 4,
      trip_template: 5,
    })
    .populate({
      path: "locations",
      options: { sort: { date: 1 } },
    })
    .populate("vehicle_id", { plate_no: 1, name: 2 })
    .populate("diesels")
    .sort({ createdAt: "desc" })
    .skip((currentPage - 1) * perPage)
    .limit(perPage)
    .then((trips) => {
      res.status(200).json({
        message: "Success get apk delivery trips",
        data: trips,
        pagination: {
          totalItems: trips.length,
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



exports.getTripDelivery = (req, res, next) => {
  const { query } = req;
  const currentPage = query.page || 1;
  const perPage = query.limit || 25;
  const searchItem = query?.search?.toLowerCase() || "";
  const searchBy = query.searchBy || "_id";
  const dateItem = query.date;
  const userDepartment = req?.department;
  const types_of_trips = query.types_of_trips;
  const show_all_departments = req?.show_all_departments;
  let newTrips = [];

  let filter;

  if (types_of_trips === "early_trips") {
    const startHour = 0;
    const endHour = 4;
    console.log('early trips');
    filter = {
      $expr: {
        $and: [
          { $gte: [{ $hour: '$trip_date' }, startHour] },
          { $lt: [{ $hour: '$trip_date' }, endHour] }
        ]
      }
    };
  } else if(types_of_trips === "regular_trips") {
      const startHour = 8;
      const endHour = 17;
      console.log('regular_trips');
      filter = {
        $expr: {
          $and: [
            { $gte: [{ $hour: '$trip_date' }, startHour] },
            { $lt: [{ $hour: '$trip_date' }, endHour] }
          ]
        }
      };
  } else if(types_of_trips === "overtime_trips") {
    const startHour = 18;
    const endHour = 24;
    console.log('overtime_trips');
    filter = {
      $expr: {
        $and: [
          { $gte: [{ $hour: '$trip_date' }, startHour] },
          { $lt: [{ $hour: '$trip_date' }, endHour] }
        ]
      }
    };
} else{
    
    filter =
      searchBy === "trip_date" || searchBy === "createdAt"
        ? {
            [searchBy]: {
              $gte: `${dateItem}T00:00:00`,
              $lte: `${dateItem}T23:59:59`,
            },
          }
        : {};
  }

 
TripDelivery.find(filter)
  .populate("user_id", {
    employee_id: 1,
    first_name: 2,
    last_name: 3,
    department: 4,
  })
  .populate({ path: "locations", options: { sort: { date: 1 } } })
  .populate("vehicle_id", { plate_no: 1 })
  .populate("diesels")
  .sort({ createdAt: "desc" })
  .then((trips) => {
    let newTrips;

    if (show_all_departments) {
      newTrips = trips;
    } else {
      newTrips = trips.filter((trip) => {
        return trip?.user_id?.department.toString().includes(userDepartment);
      });
    }

    if (searchBy === "trip_date" || searchBy === "createdAt") {
      return newTrips;
    } else {
      return newTrips.filter((trip) => {
        const searchProps = searchBy.split(".");
        let obj = trip;

        for (const prop of searchProps) {
          obj = obj[prop];

          if (Array.isArray(obj)) {
            return obj.find((el) =>
              el.toString().toLowerCase().includes(searchItem)
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
      message: "Success get delivery trips",
      data: result,
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

// new get delivery trips
// exports.fetchTripDelivery = async (req, res, next) => {
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
//     const typesOfTrip = req.query.typesOfTrip;

//     let filter, totalItems;

//     //new update (2024-02-16)
//     //added a filter on trip_date and sync date
//     if (typesOfTrip === "early_trips" && (searchBy === "trip_date" || searchBy === "createdAt")) {
//       const dateFilter = {
//         [searchBy]: {
//             $gte: new Date(`${dateFrom}T00:00:00`),
//             $lte: new Date(`${dateTo}T23:59:59`)
//         }
        
//     };
//       const timeFilter = {
//           $expr: {
//               $and: [
//                   { $gte: [{ $hour: '$trip_date' }, 14] }, // 2 pm
//                   { $lt: [{ $hour: '$trip_date' }, 16] }   // 4 pm
//               ]
//           }
//       };
//       filter = {
//           $and: [dateFilter, timeFilter]
//       };
//     } else if (typesOfTrip === "regular_trips" && (searchBy === "trip_date" || searchBy === "createdAt")) {
          
//           const dateFilter = {
//             [searchBy]: {
//                 $gte: new Date(`${dateFrom}T00:00:00`),
//                 $lte: new Date(`${dateTo}T23:59:59`)
//             }
            
//         };

//         const timeFilter = {
//           $or: [
//               {
//                   $and: [
//                       { $expr: { $gte: [{ $hour: `$trip_date` }, 17] } }, // 1am  
//                       { $expr: { $lt: [{ $hour: `$trip_date` }, 24] } }  //8am
//                   ]
//               },
//               {
//                   $and: [
//                       { $expr: { $gte: [{ $hour: `$trip_date` }, 0] } }, // 8am 
//                       { $expr: { $lt: [{ $hour: `$trip_date` }, 14] } }  //10pm
//                   ]
//               }
//           ]
//       };
      
    
//         filter = {
//             $and: [dateFilter, timeFilter]
//         };
//       }
//       else if (typesOfTrip === "early_trips") {
//         filter = {
//           $expr: {
//             $and: [
//               { $gte: [{ $hour: '$trip_date' }, 14] }, // 10 pm
//               { $lt: [{ $hour: '$trip_date' }, 16] }  // 12 am
//             ]
//           }
//         };
//       } else if (typesOfTrip === "regular_trips") {
//         filter = {
//           $expr: {
//             $or: [
//               {
//                 $and: [
//                   { $gte: [{ $hour: '$trip_date' }, 17] }, // 1am
//                   { $lt: [{ $hour: '$trip_date' }, 24] } // 8am
//                 ]
//               },
//               {
//                 $and: [
//                   { $gte: [{ $hour: '$trip_date' }, 0] }, // 8am
//                   { $lt: [{ $hour: '$trip_date' }, 14] } // 10pm
//                 ]
//               }
//             ]
//           }
//         };
//       }
//       else {
//         filter =
//         searchBy === "trip_date" || searchBy === "createdAt"
//         ? {
//             [searchBy]: {
//               $gte: `${dateFrom}T00:00:00`,
//               $lte: `${dateTo}T23:59:59`,
//             },
//           }
//         : {};
//       }
    
//       // added additional on this field added service_trips
//     if (searchBy === "trip_date" || typesOfTrip === "early_trips" || typesOfTrip === "regular_trips" || typesOfTrip === "special_trips" || typesOfTrip === "service_trips"  || searchBy === "createdAt") {
//       sort = { trip_date: "asc" };
//     }else{
//       sort = { createdAt: "desc" };
//     }
    
//     const all_trips = await TripDelivery.find(filter)
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
//       totalItems = await TripDelivery.countDocuments(filter);
//     }


//     const result = {
//       message: "Success get delivery trips",
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
//     res.status(500).json({ error: "Internal Server Error" });
//     return next(error);
//   }
// };

// new get trips with aggregate and pipeline 
exports.fetchTripDelivery = async (req, res, next) => {
  const { page, limit, search = "", searchBy = "_id", typesOfTrip } = req.query;

  let { dateFrom, dateTo } = req.query;

  try {
    let pageNumber = parseInt(page) || 1;
    let itemsPerPage = parseInt(limit) || 0; // Set to 0 for no limit
    const skipValue = (pageNumber - 1) * itemsPerPage;

    const pipeline = [];
    let filter = {};

    // Lookup related documents
    pipeline.push(
      {
        $lookup: {
          from: "locationdeliveries",
          localField: "locations",
          foreignField: "_id",
          as: "locations",
        }
      },
      {
        $lookup: {
          from: "dieseldeliveries",
          localField: "diesels",
          foreignField: "_id",
          as: "diesels",
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_id",
          pipeline: [
            { $project: { employee_id: 1, first_name: 1, last_name: 1, department: 1 } }
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
        }
      },
      {
        $unwind: { path: "$vehicle_id", preserveNullAndEmptyArrays: true }
      }
    );

    // Add date filters if applicable
    if (dateFrom && dateTo) {
      dateFrom = new Date(`${dateFrom}T00:00:00Z`);
      dateTo = new Date(`${dateTo}T23:59:59Z`);
      
      if (searchBy === "trip_date" || searchBy === "createdAt") {
        filter[searchBy] = { $gte: dateFrom, $lte: dateTo };
      }
    }

    // Filter based on typesOfTrip (early_trips, regular_trips, etc.)
    if (typesOfTrip === "early_trips") {
      filter = {
        ...filter,
        $expr: {
          $and: [
            { $gte: [{ $hour: "$trip_date" }, 14] }, // 2 pm
            { $lt: [{ $hour: "$trip_date" }, 16] }   // 4 pm
          ]
        }
      };
    } else if (typesOfTrip === "regular_trips") {
      filter = {
        ...filter,
        $expr: {
          $or: [
            {
              $and: [
                { $gte: [{ $hour: "$trip_date" }, 17] }, // 5 pm
                { $lt: [{ $hour: "$trip_date" }, 24] }   // midnight
              ]
            },
            {
              $and: [
                { $gte: [{ $hour: "$trip_date" }, 0] },  // midnight
                { $lt: [{ $hour: "$trip_date" }, 14] }   // 10 pm
              ]
            }
          ]
        }
      };
    }

    // Constructing filter based on search criteria
    if (search) {
      const searchTerm = search.trim(); // Case-insensitive regex
      const isNumericSearch = !isNaN(searchTerm);

      if (searchBy === "user_id.employee_id" || searchBy === "user_id.department") {
        filter[`user_id.${searchBy.split('.').pop()}`] = { $regex: searchTerm, $options: 'i' };
      } else if (searchBy === "vehicle_id.plate_no") {
        filter["vehicle_id.plate_no"] = { $regex: searchTerm, $options: 'i' };
      } else if (isNumericSearch && ["odometer", "odometer_done"].includes(searchBy)) {
        filter[searchBy] = parseInt(searchTerm, 10);
      } else {
        filter[searchBy] = { $regex: searchTerm, $options: 'i' };
      }
    }

    // Add the $match stage now that all lookups and filters are set up
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // Sorting logic
    let sort = { createdAt: -1 }; // Default sort by createdAt descending
    if (searchBy === "trip_date") {
      sort = { trip_date: 1 }; // Ascending by trip_date
    }
    pipeline.push({ $sort: sort });

    // Count the total number of matching documents
    const totalCountPipeline = [...pipeline];
    const totalCountResult = await TripDelivery.aggregate([
      ...totalCountPipeline,
      { $count: "totalItems" }
    ]);
    const totalItems = totalCountResult.length > 0 ? totalCountResult[0].totalItems : 0;

    // Pagination
    if (itemsPerPage > 0) {
      pipeline.push({ $skip: skipValue }, { $limit: itemsPerPage });
    }

    // Execute the aggregation
    const all_trips = await TripDelivery.aggregate(pipeline);

    // Prepare response
    const result = {
      message: "Success get delivery trips",
      data: all_trips,
      pagination: {
        totalItems,
        limit: itemsPerPage,
        currentPage: pageNumber,
      },
      previous_page: pageNumber > 1 ? pageNumber - 1 : null,
      next_page: itemsPerPage < totalItems ? pageNumber + 1 : null,
    };

    res.status(200).json(result);
    return next();
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    return next(error);
  }
};



exports.updateTripDelivery = (req, res, next) => {
  const tripId = req.params.tripId;

  const { charging } = req.body;

  TripDelivery.findById(tripId)
    .then((trip) => {
      if (!trip) {
        const error = new Error("Could not find trip");
        error.statusCode = 404;
        throw error;
      }

      return TripDelivery.findOneAndUpdate(
        { _id: trip._id },
        { charging: charging || trip.charging },
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
