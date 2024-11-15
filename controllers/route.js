const Route = require("../models/route");
var ObjectId = require("mongoose").Types.ObjectId;


exports.importRoutes = async (req, res, next) => {
  if (req.role !== "admin") {
    const error = new Error("Please make sure you're an admin");
    error.statusCode = 403;
    throw error;
  }

  const routes = req.body;

  routes.length > 0
    ? await routes.forEach(async (route, index) => {
        await Route.findOne({ name: route.name })
          .then((isRoute) => {
            if (!isRoute) {
              Route.create({
                name: route.name,
              });
            }
          })
          .then(() => {
            if (index === routes.length - 1) {
              res.status(201).json({
                message: "Success import routes",
                totalItem: routes.length,
              });
            }
          })
          .catch((err) => {
            if (!err.statusCode) {
              err.statusCode = 500;
            }
            next(err);
          });
      })
    : res.status(404).json({ message: "no item found" });
};

exports.getRoutes = (req, res, next) => {
  let totalItems;
  let newList;

  const currentPage = req.query.page || 1;
  const perPage = req.query.limit || 0;
  const searchItem = req.query.search || "";
  const searchBy = req.query.searchBy === "_id" ? "name" : req.query.searchBy;

  Route.find({
    [searchBy]: { $regex: `.*${searchItem}.*`, $options: "i" },
  })
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Route.find({
        [searchBy]: { $regex: `.*${searchItem}.*`, $options: "i" },
      })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .sort({ createdAt: "desc" });
    })
    .then((result) => {
      newList = [
        ...result,
      ];
      res.status(200).json({
        message: "Fetched routes successfully",
        data: newList,
        pagination: {
          totalItems: totalItems + 1,
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

exports.createRoute = (req, res, next) => {
  
  const name = req.body.name;

  Route.find({ name: name })
    .then((result) => {
      if (result.length > 0) {
        res.status(409).json({ error: `Routes "${name}" already exist` });
      } else {
        const routes = new Route({
          name: name,
        });

        routes
          .save()
          .then((result) => {
            res.status(201).json({
              message: "Success route created",
              data: result,
            });
          })
          .catch((err) => {
            if (!err.statusCode) {
              err.statusCode = 500;
            }
            next(err);
          });
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updateRoute = (req, res, next) => {
  if (req.role !== "admin") {
    const error = new Error("Please make sure you're an admin");
    error.statusCode = 500;
    throw error;
  }
  const routesId = req.params.routesId;

  const name = req.body.name;

  Route.find({ name: name })
    .then((result) => {
      if (
        result.length <= 0 ||
        (result.length <= 1 && routesId == result[0]._id)
      ) {
        Route.findById(routesId)
          .then((route) => {
            if (!route) {
              const error = new Error("route not found");
              error.statusCode = 500;
              throw error;
            }

            route.name = name;

            return route.save();
          })
          .then((result) => {
            res.status(200).json({
              message: "Success update route",
              data: result,
            });
          })
          .catch((err) => {
            if (!err.statusCode) {
              err.statusCode = 500;
            }
            next(err);
          });
      } else {
        res.status(409).json({ error: `Route "${name}" already exist` });
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
