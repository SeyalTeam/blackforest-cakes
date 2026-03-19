var messages = require("../../utils/messages");
var Pastries = require("../../models/PastryProduct");
var Mongoose = require("mongoose");
var Employee = require("../../models/EmployeeModel");
var Sales = require("../../models/SalesModel");

var masterCalls = {
  getAllPastryProducts: (req, res, next) => {
    try {
      //   var category = req.params.category;
      //   var currentPage =
      //     req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 30;
      //   var skip = currentPage * limit;

      var name = req.query && req.query.name ? req.query.name : "";

      var cond = [];
      var sQuery = { isActive: true };

      if (name) {
        sQuery = {
          $or: [
            { name: { $regex:   "^" +name ,  $options: "i" } },
            { code: { $regex:   "^" +name ,  $options: "i" } },

            // { name: { $regex: name, $options: "i" } },
            // { code: { $regex: name, $options: "i" } }
          ],
          isActive: true
        };
      }

      cond = [
        {
          $match: sQuery,
        },
        { $sort: { created_at: -1 } },
        { $limit: limit }
      ];

      Pastries.aggregate(cond).exec((err, items) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: items,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllCashier: (req, res, next) => {
    try {
      Employee.find({ emptype: 5 }, "firstname empcode isLoginNow", (err, collection) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: "success",
            data: collection,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllBranch: (req, res, next) => {
    try {
      Employee.find({ emptype: 4 }, "firstname empcode isLoginNow", (err, collection) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: "success",
            data: collection,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllWaiter: (req, res, next) => {
    try {
      // branch: user.branch
      let q = {
        emptype: 1
      };
      if (req.query.branch) {
        q.branch = req.query.branch;
      }

      Employee.find(q, "firstname empcode isLoginNow", (err, collection) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          var salesLoginBy = req.query.salesMan ? req.query.salesMan : "";
          if (salesLoginBy) {
            var sQuery = {};
            sQuery.salesLoginBy = new Mongoose.Types.ObjectId(salesLoginBy);


            var cond = [
              {
                $match: sQuery,
              },
              {
                $lookup: {
                  from: "employees",
                  localField: "waiter",
                  foreignField: "_id",
                  as: "salesMan",
                },
              },
              {
                $unwind: {
                  path: "$salesMan",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  "_id": "$waiter",
                  emp: { $first: "$salesMan" },
                },
              },
              {
                "$project": {
                  "_id": 1,
                  "firstname": "$emp.firstname",
                  "isLoginNow": "$emp.isLoginNow",
                  "empcode": "$emp.empcode",
                }
              }
            ];
            Sales.aggregate(cond).exec((err, items) => {
              if (err) {
                res.status(400).json({
                  message: err.message,
                });
              } else {
                const originalArray = items.concat(collection);
                const newArray = [];
                const lookupObject = {};

                for (var i in originalArray) {
                  lookupObject[originalArray[i]['_id']] = originalArray[i];
                }

                for (i in lookupObject) {
                  newArray.push(lookupObject[i]);
                }

                res.status(200).json({
                  message: messages.getAllMsg,
                  data: newArray,
                });
              }
            });
          } else {
            res.status(200).json({
              message: "success",
              data: collection,
            });
          }
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getProductsForDropDown: (req, res, next) => {
    try {
      Pastries.find({}, "name", (err, collection) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: "success",
            data: collection,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
};

module.exports = masterCalls;
