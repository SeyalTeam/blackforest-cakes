var Order = require("../models/OrderModel");
var Product = require("../models/ProductModel");
var Pastry = require("../models/PastryProduct");
var StockOrder = require("../models/StockordersModel");
var PastryOrder = require("../models/PastriesModel");
var ReturnOrder = require("../models/ReturnOrdersModel");
var Mongoose = require("mongoose");
var messages = require("../utils/messages");

var reportCalls = {
  getAllOrderReport: (req, res) => {
    try {
      var branch = req.query.branch ? req.query.branch : "";
      var status = req.query.status ? req.query.status : "";
      var category = req.query.category ? req.query.category : "";
      var products = req.query.productFilter ? req.query.productFilter : [];

      var cond = [];
      var cond2 = [];
      var cond3 = [];
      var returnCond = [];
      var orderQuery = {};
      var sQuery = {};
      var pasExtraQuery = {};
      var additionalQuery = {};
      var returnOrderQuery = {};
      var productQ = {};
      var productCateQ = {};
      var pasProductQ = {};
      var branchQreturn = {};
      var branchQstocks = {};

      if (branch) {
        orderQuery.branch = new Mongoose.Types.ObjectId(branch);
        branchQreturn = {
          "employees.branch": new Mongoose.Types.ObjectId(branch),
        };
        branchQstocks = {
          "employees.branch": new Mongoose.Types.ObjectId(branch),
        };
      }

      if (status) {
        orderQuery.status = status == 2 ? "3" : status;
        additionalQuery = { "pastry.status": status };
      }

      if (req.query.orderfrom) {
        var sortOrder = req.query.orderfrom;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        pasExtraQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        orderQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        returnOrderQuery.return_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.orderto) {
        var sortOrder = req.query.orderto;
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = { $lte: new Date(stopDate) };
        pasExtraQuery.created_at = { $lte: new Date(stopDate) };
        orderQuery.created_at = { $lte: new Date(stopDate) };
        returnOrderQuery.return_date = { $lt: new Date(stopDate) };
      }

      if (req.query.orderfrom && req.query.orderto) {
        var sortOrder = req.query.orderfrom;
        var sortOrder2 = req.query.orderto;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        pasExtraQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        orderQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        returnOrderQuery.return_date = {
          $gte: new Date(firstDate),
          $lt: new Date(stopDate),
        };
      }

      if (req.query.deliveryFrom) {
        var sortOrder = req.query.deliveryFrom;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.delivery_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        pasExtraQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        orderQuery.delivery_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.deliveryTo) {
        var sortOrder = req.query.deliveryTo;
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        pasExtraQuery.created_at = { $lte: new Date(stopDate) };
        sQuery.delivery_date = { $lte: new Date(stopDate) };
        orderQuery.delivery_date = { $lte: new Date(stopDate) };
      }

      if (req.query.deliveryFrom && req.query.deliveryTo) {
        var sortOrder = req.query.deliveryFrom;
        var sortOrder2 = req.query.deliveryTo;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        sQuery.delivery_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        pasExtraQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
        orderQuery.delivery_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      const catArr = [];

      if (category && category.length > 0) {
        category.forEach((item) => {
          catArr.push(new Mongoose.Types.ObjectId(item));
        });
        sQuery.category = { $in: catArr };
        pasExtraQuery.category = { $in: catArr };
      }

      const productArr = [];
      if (products && products.length > 0) {
        products.forEach((element) => {
          productArr.push(new Mongoose.Types.ObjectId(element));
        });
        pasProductQ = {
          "pastry.p_id": { $in: productArr },
        };
        productQ = {
          "pastry._id": { $in: productArr },
        };
        productCateQ = {
          "pastry.category": { $in: catArr },
        };
      }

      // Order category
      if (category && category.length > 0 && products && products.length > 0) {
        cond = [
          {
            $match: orderQuery,
          },
          {
            $lookup: {
              from: "products",
              localField: "product._id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: {
              path: "$productDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              "productDetails.category": { $in: catArr },
              "productDetails._id": { $in: productArr },
            },
          },
          {
            $lookup: {
              from: "productcategories",
              localField: "productDetails.category",
              foreignField: "_id",
              as: "categoryData",
            },
          },
          {
            $lookup: {
              from: "stores",
              localField: "branch",
              foreignField: "_id",
              as: "branchDetails",
            },
          },
        ];

        returnCond = [
          {
            $match: returnOrderQuery,
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
            $match: pasProductQ,
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
              path: "$pastryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              "pastry.category": { $in: catArr },
            },
          },
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
            $match: branchQreturn,
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
        ];
      } else if (products && products.length > 0) {
        cond = [
          {
            $match: orderQuery,
          },
          {
            $lookup: {
              from: "products",
              localField: "product._id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: {
              path: "$productDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              "productDetails._id": { $in: productArr },
            },
          },
          {
            $lookup: {
              from: "productcategories",
              localField: "productDetails.category",
              foreignField: "_id",
              as: "categoryData",
            },
          },
          {
            $lookup: {
              from: "stores",
              localField: "branch",
              foreignField: "_id",
              as: "branchDetails",
            },
          },
        ];

        returnCond = [
          {
            $match: returnOrderQuery,
          },
          {
            $unwind: {
              path: "$pastry",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: pasProductQ,
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
              path: "$pastryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
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
            $match: branchQreturn,
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
        ];
      } else if (category && category.length > 0) {
        cond = [
          {
            $match: orderQuery,
          },
          {
            $lookup: {
              from: "products",
              localField: "product._id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: {
              path: "$productDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              "productDetails.category": { $in: catArr },
            },
          },
          {
            $lookup: {
              from: "productcategories",
              localField: "productDetails.category",
              foreignField: "_id",
              as: "categoryData",
            },
          },
          {
            $lookup: {
              from: "stores",
              localField: "branch",
              foreignField: "_id",
              as: "branchDetails",
            },
          },
        ];

        returnCond = [
          {
            $match: returnOrderQuery,
          },
          {
            $unwind: {
              path: "$pastry",
              preserveNullAndEmptyArrays: true,
            },
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
              path: "$pastryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              "pastry.category": { $in: catArr },
            },
          },
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
            $match: branchQreturn,
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
        ];
      } else {
        cond = [
          {
            $match: orderQuery,
          },
          {
            $lookup: {
              from: "products",
              localField: "product._id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: {
              path: "$productDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "productcategories",
              localField: "productDetails.category",
              foreignField: "_id",
              as: "categoryData",
            },
          },
          {
            $lookup: {
              from: "stores",
              localField: "branch",
              foreignField: "_id",
              as: "branchDetails",
            },
          },
        ];

        returnCond = [
          {
            $match: returnOrderQuery,
          },
          {
            $unwind: {
              path: "$pastry",
              preserveNullAndEmptyArrays: true,
            },
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
              path: "$pastryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
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
            $match: branchQreturn,
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
        ];
      }

      cond2 = [
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
          $match: productQ,
        },
        { $match: additionalQuery },
        {
          $lookup: {
            from: "pastries",
            localField: "pastry._id",
            foreignField: "_id",
            as: "pastryDetails",
          },
        },
        {
          $unwind: {
            path: "$pastryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "productcategories",
            localField: "pastryDetails.category",
            foreignField: "_id",
            as: "categoryData",
          },
        },
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
          $match: branchQstocks,
        },
      ];

      cond3 = [
        { $match: pasExtraQuery },
        {
          $unwind: {
            path: "$pastry",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: productQ,
        },
        { $match: additionalQuery },
        {
          $lookup: {
            from: "pastries",
            localField: "pastry._id",
            foreignField: "_id",
            as: "pastryDetails",
          },
        },
        {
          $unwind: {
            path: "$pastryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "productcategories",
            localField: "pastryDetails.category",
            foreignField: "_id",
            as: "categoryData",
          },
        },
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
          $match: branchQstocks,
        },
      ];

      Order.aggregate(cond).exec((err, orderItems) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          StockOrder.aggregate(cond2).exec((err, stockItems) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              PastryOrder.aggregate(cond3).exec((err, pastryItems) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else {
                  let totalSales = 0;
                  let branchOrderVal = 0;
                  let stockOrderVal = 0;
                  let reguOrderVal = 0;

                  if (orderItems.length > 0) {
                    orderItems.forEach((item) => {
                      totalSales =
                        parseFloat(totalSales) + parseFloat(item.amount);
                      reguOrderVal =
                        parseFloat(reguOrderVal) + parseFloat(item.amount);
                    });
                  }

                  if (stockItems.length > 0) {
                    stockItems.forEach((item) => {
                      totalSales =
                        parseFloat(totalSales) +
                        parseFloat(item.pastry.sendTotal);
                      stockOrderVal =
                        parseFloat(stockOrderVal) +
                        parseFloat(item.pastry.sendTotal);
                    });
                  }

                  if (pastryItems.length > 0) {
                    pastryItems.forEach((item) => {
                      totalSales =
                        parseFloat(totalSales) +
                        parseFloat(item.pastry.sendTotal);
                      branchOrderVal =
                        parseFloat(branchOrderVal) +
                        parseFloat(item.pastry.sendTotal);
                    });
                  }
                  res.status(200).json({
                    message: messages.getAllMsg,
                    data: {
                      order: orderItems,
                      stocks: stockItems,
                      pastries: pastryItems,
                      totalSales: totalSales,
                      stockOrderVal: stockOrderVal,
                      branchOrderVal: branchOrderVal,
                      regularOrdersTotal: reguOrderVal,
                    },
                  });

                  // ReturnOrder.aggregate(returnCond).exec((err, returnItems) => {
                  //   if (err) {
                  //     res.status(400).json({
                  //       message: err.message,
                  //     });
                  //   } else {
                  //     res.status(200).json({
                  //       message: messages.getAllMsg,
                  //       data: {
                  //         order: orderItems,
                  //         stocks: stockItems,
                  //         pastries: pastryItems,
                  //         totalSales: totalSales,
                  //         returnItems: returnItems,
                  //         stockOrderVal: stockOrderVal,
                  //         branchOrderVal: branchOrderVal,
                  //       },
                  //     });
                  //   }
                  // });
                }
              });
            }
          });
        }
      });
    } catch (exp) {
      console.log(exp, "exp");

      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllProductReport: (req, res) => {
    try {
      let type = "";

      if (req.query && req.query.contentFor) {
        type = req.query.contentFor;
      }

      if (type === "pastry") {
        reportCalls.getPastryProductReport(req, res);
      }
      if (type === "product") {
        reportCalls.getRegularProductReport(req, res, false);
      } else {
        reportCalls.getRegularProductReport(req, res, true);
      }
    } catch (exp) {
      console.log(exp, "exp");

      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getRegularProductReport: (req, res, hasNextData) => {
    try {
      var category = req.query.category ? req.query.category : "";
      var branch = req.query.branch ? req.query.branch : "";
      var fromDate = req.query.orderStart ? req.query.orderStart : "";
      var toDate = req.query.orderEnd ? req.query.orderEnd : "";

      var cond = [
        {
          $match: {},
        },
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "product._id",
            as: "orderDetails",
          },
        },
        {
          $group: {
            _id: "$_id",
            name: { $first: "$name" },
            shop_orders: { $first: "$orderDetails" },
            total_orders: { $first: "$orderDetails" },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            shop_orders: {
              $cond: {
                if: { $isArray: "$shop_orders" },
                then: { $size: "$shop_orders" },
                else: "0",
              },
            },
            total_orders: {
              $cond: {
                if: { $isArray: "$shop_orders" },
                then: { $size: "$shop_orders" },
                else: "0",
              },
            },
            stock_orders: "0",
            brach_orders: "0",
          },
        },
        { $sort: { total_orders: -1 } },
      ];
      Product.aggregate(cond).exec((err, items) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          if (category) {
            if (hasNextData) {
              reportCalls.getPastryProductReport(req, res, items);
            } else {
              res.status(200).json({
                message: messages.getAllMsg,
                data: items,
              });
            }
          } else {
            Order.countDocuments(
              { product: { $exists: false } },
              (err, totalOrder) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else {
                  var newI = {
                    _id: null,
                    name: "PhotoCake Order",
                    shop_orders: totalOrder,
                    total_orders: totalOrder,
                    stock_orders: "0",
                    brach_orders: "0",
                  };
                  const pItems = [newI, ...items];

                  if (hasNextData) {
                    reportCalls.getPastryProductReport(req, res, pItems);
                  } else {
                    res.status(200).json({
                      message: messages.getAllMsg,
                      data: pItems,
                    });
                  }
                }
              }
            );
          }
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getPastryProductReport: (req, res, productData) => {
    try {
      var category = req.query.category ? req.query.category : "";
      var branch = req.query.branch ? req.query.branch : "";
      var fromDate = req.query.orderStart ? req.query.orderStart : "";
      var toDate = req.query.orderEnd ? req.query.orderEnd : "";
      var cond = [
        {
          $match: {},
        },
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "pastry._id",
            as: "pastryOrderDetails",
          },
        },
        {
          $lookup: {
            from: "pastries_orders",
            localField: "_id",
            foreignField: "pastry._id",
            as: "pastryProductOrderDetails",
          },
        },
        {
          $group: {
            _id: "$_id",
            name: { $first: "$name" },
            shop_orders: { $first: "$pastryOrderDetails" },
            // branchPastries: {
            //   $push: {
            //     $cond: [],
            //   },
            // },
            branchPastries: { $first: "$pastryProductOrderDetails.pastry" },
            // pastrys: { $sum: "$pastryProductOrderDetails.pastry.sendQty" },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            branchPastries: 1,
            shop_orders: {
              $cond: {
                if: { $isArray: "$shop_orders" },
                then: { $size: "$shop_orders" },
                else: "0",
              },
            },
            total_orders: "0",
            stock_orders: "0",
            brach_orders: "0",
          },
        },
        { $sort: { total_orders: -1 } },
      ];

      Pastry.aggregate(cond).exec((err, orderReport) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data:
              productData && productData.length > 0
                ? productData.concat(orderReport)
                : orderReport,
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

module.exports = reportCalls;
