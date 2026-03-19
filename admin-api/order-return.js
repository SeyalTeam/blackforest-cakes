var ReturnOrder = require("../models/ReturnOrdersModel");
var messages = require("../utils/messages");
var Mongoose = require("mongoose");

var returnOrderCalls = {
  printOrders: (req, res) => {
    try {
      const branch = req.query.branch;

      let sQuery = {};
      var productQ = {};
      var productCateQ = {};

      if (branch) {
        sQuery.created_by = new Mongoose.Types.ObjectId(branch);
      }

      if (req.query.filterProducts && req.query.filterProducts.length > 0) {
        const productArr = [];

        req.query.filterProducts.forEach((item) => {
          productArr.push(new Mongoose.Types.ObjectId(item));
        });
        productQ = {
          "pastry.p_id": { $in: productArr },
        };
      }

      if (req.query.category && req.query.category.length > 0) {
        // sQuery.category = new Mongoose.Types.ObjectId(req.query.liveCategory);
        const catArr = [];

        req.query.category.forEach((item) => {
          catArr.push(new Mongoose.Types.ObjectId(item));
        });
        productCateQ = {
          "pastry.category": { $in: catArr },
        };
      }

      if (req.query.returnDateFrom) {
        var sortOrder = req.query.returnDateFrom;
        var startDate = new Date(sortOrder);
        sQuery.return_date = { $gte: startDate };
      }

      if (req.query.returnDateTo) {
        var sortOrder = req.query.returnDateTo;
        var endDate = new Date(sortOrder);
        endDate = endDate.setDate(endDate.getDate() + 1);
        sQuery.return_date = { $lt: new Date(endDate) };
      }

      if (req.query.returnDateFrom && req.query.returnDateTo) {
        var sortOrder = req.query.returnDateFrom;
        var startDate = new Date(sortOrder);
        var sortOrder = req.query.returnDateTo;
        var endDate = new Date(sortOrder);
        endDate = endDate.setDate(endDate.getDate() + 1);
        sQuery.return_date = { $gte: startDate, $lt: new Date(endDate) };
      }

      cond = [
        {
          $match: sQuery,
        },
        {
          $unwind: {
            path: "$pastry",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: productCateQ,
        },
        {
          $match: productQ,
        },
        {
          $lookup: {
            from: "pastries",
            localField: "pastry.p_id",
            foreignField: "_id",
            as: "pastry.pastryDetails",
          },
        },
        {
          $unwind: {
            path: "$pastry",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "employees",
            localField: "created_by",
            foreignField: "_id",
            as: "pastry.employees",
          },
        },
        {
          $unwind: {
            path: "$pastry.employees",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$pastry.pastryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: { category: "$pastry.category" },
            pastry: { $addToSet: "$pastry" },
          },
        },
        {
          $lookup: {
            from: "productcategories",
            localField: "_id.category",
            foreignField: "_id",
            as: "productCategory",
          },
        },
        {
          $unwind: {
            path: "$productCategory",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      ReturnOrder.aggregate(cond).exec((err, items) => {
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
      console.log(exp);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllReturnOrders: (req, res) => {
    try {
      const branch = req.query.branch;
      const currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      const limit = 15;
      const skip = currentPage * limit;

      let sQuery = {};
      var productQ = {};
      var productCateQ = {};

      if (branch) {
        sQuery.created_by = new Mongoose.Types.ObjectId(branch);
      }

      if (req.query.filterProducts && req.query.filterProducts.length > 0) {
        const productArr = [];

        req.query.filterProducts.forEach((item) => {
          productArr.push(new Mongoose.Types.ObjectId(item));
        });
        productQ = {
          "pastry.p_id": { $in: productArr },
        };
      }

      if (req.query.category && req.query.category.length > 0) {
        // sQuery.category = new Mongoose.Types.ObjectId(req.query.liveCategory);
        const catArr = [];

        req.query.category.forEach((item) => {
          catArr.push(new Mongoose.Types.ObjectId(item));
        });
        productCateQ = {
          "pastry.category": { $in: catArr },
        };
      }

      if (req.query.returnDateFrom) {
        var sortOrder = req.query.returnDateFrom;
        var startDate = new Date(sortOrder);
        sQuery.return_date = { $gte: startDate };
      }

      if (req.query.returnDateTo) {
        var sortOrder = req.query.returnDateTo;
        var endDate = new Date(sortOrder);
        endDate = endDate.setDate(endDate.getDate() + 1);
        sQuery.return_date = { $lt: new Date(endDate) };
      }

      if (req.query.returnDateFrom && req.query.returnDateTo) {
        var sortOrder = req.query.returnDateFrom;
        var startDate = new Date(sortOrder);
        var sortOrder = req.query.returnDateTo;
        var endDate = new Date(sortOrder);
        endDate = endDate.setDate(endDate.getDate() + 1);
        sQuery.return_date = { $gte: startDate, $lt: new Date(endDate) };
      }

      cond = [
        {
          $match: sQuery,
        },
        {
          $unwind: {
            path: "$pastry",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: productCateQ,
        },
        {
          $match: productQ,
        },
        {
          $lookup: {
            from: "pastries",
            localField: "pastry.p_id",
            foreignField: "_id",
            as: "pastry.pastryDetails",
          },
        },
        // {
        //   $unwind: {
        //     path: "$pastryDetails",
        //     preserveNullAndEmptyArrays: true,
        //   },
        // },
        {
          $lookup: {
            from: "employees",
            localField: "created_by",
            foreignField: "_id",
            as: "employees",
          },
        },
        {
          $unwind: {
            path: "$employees",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            created_by: { $first: "$created_by" },
            return_date: { $first: "$return_date" },
            pastry: { $addToSet: "$pastry" },
            employees: { $first: "$employees" },
          },
        },
        {
          $facet: {
            paginatedResults: [
              { $sort: { created_at: -1 } },
              { $skip: skip },
              { $limit: limit },
            ],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ];

      ReturnOrder.aggregate(cond).exec((err, items) => {
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
      console.log(exp);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  confirmReturn: (req, res) => {
    try {
      const returnId = req.params.id;
      ReturnOrder.findById(returnId, (err, resp) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else if (resp) {
          const pastryid = req.body.pastry;
          const qty = req.body.qty;

          const _updateItems = [];
          resp.pastry.forEach((element) => {
            if (element.p_id == pastryid) {
              element.qty = [
                {
                  items: qty,
                  confirmed: true,
                },
              ];
            }
            _updateItems.push(element);
          });

          ReturnOrder.updateOne(
            { _id: resp._id },
            { $set: { pastry: _updateItems } },
            (error, result) => {
              if (error) {
                res.status(400).json({
                  message: error.message,
                });
              } else {
                res.status(200).json({
                  message: messages.saveMsg("Return order"),
                });
              }
            }
          );
        } else {
          res.status(404).json({
            message: "Not found",
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
module.exports = returnOrderCalls;
