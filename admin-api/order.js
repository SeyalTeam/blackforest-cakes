var Order = require("../models/OrderModel");
var PastryOrder = require("../models/PastriesModel");
var Branch = require("../models/StoreModel");
var Mongoose = require("mongoose");
var messages = require("../utils/messages");
var notify = require("../models/NotificationModel");
var pushNotify = require("../utils/notification");
var timeLine = require("../models/OrderTimeLineModel");

var orderCalls = {
  getAllOrders: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 15;
      var skip = currentPage * limit;

      var branch = req.query.branch ? req.query.branch : "";
      var status = req.query.status ? req.query.status : "";
      var formNo = req.query.form_no ? req.query.form_no : "";
      var categories = req.query.categories ? req.query.categories : [];
      var products = req.query.products ? req.query.products : [];
      var productQ = {};
      var categoriesQ = {};
      var waiter = req.query.waiter ? req.query.waiter : "";

      var cond = [];
      var sQuery = {};

      if (branch) {
        sQuery.branch = new Mongoose.Types.ObjectId(branch);
      }

      if (waiter) {
        sQuery.sales_man = new Mongoose.Types.ObjectId(waiter);
      }

      if (formNo) {
        sQuery.form_no = { $regex: formNo, $options: "i" };
      }

      if (status) {
        sQuery.status = status;
      }

      if (products && products.length > 0) {
        var newArr = [];
        products.forEach((element) => {
          newArr.push(new Mongoose.Types.ObjectId(element));
        });
        productQ = {
          "filterProduct._id": { $in: newArr },
        };
      }

      if (categories && categories.length > 0) {
        var newArrC = [];
        categories.forEach((element) => {
          newArrC.push(new Mongoose.Types.ObjectId(element));
        });
        categoriesQ = {
          "filterProduct.category": { $in: newArrC },
        };
      }

      if (req.query.sortBy) {
        var sortOrder = req.query.sortBy;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.sortByTo) {
        var sortOrder = req.query.sortByTo;
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = { $lte: new Date(stopDate) };
      }

      if (req.query.sortBy && req.query.sortByTo) {
        var sortOrder = req.query.sortBy;
        var sortOrder2 = req.query.sortByTo;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.delivery) {
        var sortOrder = req.query.delivery;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.delivery_date = {
          $gte: new Date(firstDate),
        };
      }

      if (req.query.deliveryTo) {
        var sortOrder = req.query.deliveryTo;
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.delivery_date = { $lte: new Date(stopDate) };
      }

      if (req.query.delivery && req.query.deliveryTo) {
        var sortOrder = req.query.delivery;
        var sortOrder2 = req.query.deliveryTo;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        sQuery.delivery_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      cond = [
        {
          $match: sQuery,
        },
        {
          $lookup: {
            from: "products",
            localField: "product._id",
            foreignField: "_id",
            as: "filterProduct",
          },
        },
        {
          $unwind: {
            path: "$filterProduct",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: categoriesQ },
        {
          $match: productQ,
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
          $lookup: {
            from: "stores",
            localField: "branch",
            foreignField: "_id",
            as: "branchDetails",
          },
        },
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
            from: "employees",
            localField: "prepared_by",
            foreignField: "_id",
            as: "preparedUser",
          },
        },
        {
          $lookup: {
            from: "employees",
            localField: "sales_man",
            foreignField: "_id",
            as: "employees",
          },
        },
        {
          $unwind: {
            path: "$preparedBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $facet: {
            paginatedResults: [
              { $sort: { status: 1, delivery_date: 1, delivery_time: -1 } },
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

      Order.aggregate(cond).exec((err, items) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          Order.aggregate([
            {
              $match: sQuery,
            },
            {
              $project: {
                _id: 1,
                ordered: {
                  $cond: [{ $eq: ["$status", "1"] }, 1, 0],
                },
                prepared: {
                  $cond: [{ $eq: ["$status", "4"] }, 1, 0],
                },
                ready: {
                  $cond: [{ $eq: ["$status", "5"] }, 1, 0],
                },
              },
            },
            {
              $group: {
                _id: null,
                allorders: { $sum: 1 },
                ordered: { $sum: "$ordered" },
                prepared: { $sum: "$prepared" },
                ready: { $sum: "$ready" },
              },
            },
          ]).exec((errors, ordersDocs) => {
            if (errors) {
              res.status(400).json({
                message: errors.message,
              });
            } else {
              res.status(200).json({
                message: messages.getAllMsg,
                data: items,
                records: ordersDocs,
              });
            }
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
  getAllOrdersForPrint: (req, res, next) => {
    try {
      var branch = req.query.branch ? req.query.branch : "";
      var status = req.query.status ? req.query.status : "";
      var productQ = {};
      var categoriesQ = {};
      var categories = req.query.categories ? req.query.categories : [];
      var products = req.query.products ? req.query.products : [];
      var waiter = req.query.waiter ? req.query.waiter : "";

      var cond = [];
      var sQuery = {};

      if (branch) {
        sQuery.branch = new Mongoose.Types.ObjectId(branch);
      }

      if (waiter) {
        sQuery.sales_man = new Mongoose.Types.ObjectId(waiter);
      }
      if (status) {
        sQuery.status = status;
      }
      if (products && products.length > 0) {
        var newArr = [];
        products.forEach((element) => {
          newArr.push(new Mongoose.Types.ObjectId(element));
        });
        productQ = {
          "filterProduct._id": { $in: newArr },
        };
      }

      if (categories && categories.length > 0) {
        var newArrC = [];
        categories.forEach((element) => {
          newArrC.push(new Mongoose.Types.ObjectId(element));
        });
        categoriesQ = {
          "filterProduct.category": { $in: newArrC },
        };
      }

      if (req.query.sortBy) {
        var sortOrder = req.query.sortBy;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.sortByTo) {
        var sortOrder = req.query.sortByTo;
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = { $lte: new Date(stopDate) };
      }

      if (req.query.sortBy && req.query.sortByTo) {
        var sortOrder = req.query.sortBy;
        var sortOrder2 = req.query.sortByTo;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.delivery) {
        var sortOrder = req.query.delivery;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.delivery_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.deliveryTo) {
        var sortOrder = req.query.deliveryTo;
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.delivery_date = { $lte: new Date(stopDate) };
      }

      if (req.query.delivery && req.query.deliveryTo) {
        var sortOrder = req.query.delivery;
        var sortOrder2 = req.query.deliveryTo;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        sQuery.delivery_date = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      cond = [
        {
          $match: sQuery,
        },
        {
          $lookup: {
            from: "products",
            localField: "product._id",
            foreignField: "_id",
            as: "filterProduct",
          },
        },
        {
          $unwind: {
            path: "$filterProduct",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: productQ,
        },
        { $match: categoriesQ },
        {
          $lookup: {
            from: "products",
            localField: "product._id",
            foreignField: "_id",
            as: "productDetails",
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
        {
          $lookup: {
            from: "productcategories",
            localField: "productDetails.category",
            foreignField: "_id",
            as: "categoryData",
          },
        },
      ];

      Order.aggregate(cond).exec((err, items) => {
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

  getAllPastryOrders: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 5;
      var skip = currentPage * limit;

      var createdBy = req.query.user ? req.query.user : "";
      var category = req.query.category ? req.query.category : "";
      var cond = [];
      var sQuery = {};

      if (createdBy) {
        sQuery.created_by = new Mongoose.Types.ObjectId(createdBy);
      }

      if (category) {
        sQuery.category = new Mongoose.Types.ObjectId(category);
      }

      if (req.query.sortBy) {
        var sortOrder = req.query.sortBy;
        let dateNow = new Date();
        let prevDate;

        if (sortOrder === "1y") {
          prevDate = dateNow.setMonth(dateNow.getMonth() - 12);
        } else if (sortOrder === "6m") {
          prevDate = dateNow.setMonth(dateNow.getMonth() - 6);
        } else if (sortOrder === "1m") {
          prevDate = dateNow.setMonth(dateNow.getMonth() - 1);
        } else if (sortOrder === "1w") {
          prevDate = dateNow.setDate(dateNow.getDate() - 7);
        } else if (sortOrder === "1d") {
          prevDate = dateNow.setDate(dateNow.getDate() - 1);
        }
        var now = new Date().setHours(23, 59, 59, 999);
        prevDate = prevDate ? new Date(prevDate) : new Date(now);
        sQuery.created_at = { $gte: prevDate };
      }

      // if (req.query.delivery) {
      //   var sortOrder = req.query.delivery;
      //   let dateNow = new Date();
      //   let prevDate;

      //   if (sortOrder === '1w') {
      //     prevDate = dateNow.setDate(dateNow.getDate() + 7);
      //   } else if (sortOrder === '1dn') {
      //     prevDate = dateNow.setDate(dateNow.getDate() + 1);
      //   }
      //   var now = new Date().setHours(0,0,0,0);

      //   prevDate = prevDate ? new Date(prevDate) : new Date(now);
      //   sQuery.delivery_date = { $gte: prevDate };
      // }

      cond = [
        {
          $match: sQuery,
        },
        {
          $lookup: {
            from: "employees",
            localField: "created_by",
            foreignField: "_id",
            as: "employeeDetail",
          },
        },
        {
          $unwind: {
            path: "$employeeDetail",
            preserveNullAndEmptyArrays: true,
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

      PastryOrder.aggregate(cond).exec((err, items) => {
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

  getAllBranch: (req, res, next) => {
    try {
      Branch.find((err, branches, phone) => {
        if (err) {
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: branches,
            phone,
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

  getOrderById: (req, res, next) => {
    try {
      var pId = req.params.order;
      var cond = [];
      var sQuery = { _id: new Mongoose.Types.ObjectId(pId) };

      cond = [
        {
          $match: sQuery,
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
            from: "stores",
            localField: "branch",
            foreignField: "_id",
            as: "branchDetails",
          },
        },
        {
          $unwind: {
            path: "$branchDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
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
            localField: "productDetails.category",
            foreignField: "_id",
            as: "productCategory",
          },
        },
        {
          $lookup: {
            from: "employees",
            localField: "sales_man",
            foreignField: "_id",
            as: "employees",
          },
        },

        {
          $lookup: {
            from: "addons",
            localField: "addon._id",
            foreignField: "_id",
            as: "addonDetails",
          },
        },
      ];

      Order.aggregate(cond).exec((err, items) => {
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

  getPastryOrderById: (req, res, next) => {
    try {
      var pId = req.params.order;
      var cond = [];
      var sQuery = { _id: new Mongoose.Types.ObjectId(pId) };

      cond = [
        {
          $match: sQuery,
        },
        {
          $lookup: {
            from: "productcategories",
            localField: "category",
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
            from: "productunits",
            localField: "pastryDetails.unit",
            foreignField: "_id",
            as: "pastryDetails.unitDetails",
          },
        },
        {
          $unwind: {
            path: "$pastryDetails.unitDetails",
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
          $group: {
            _id: "$_id",
            created_by: { $first: "$created_by" },
            created_at: { $first: "$created_at" },
            pastryDetails: { $push: "$pastryDetails" },
            employees: { $first: "$employees" },
            form_no: { $first: "$form_no" },
            pastry: { $first: "$pastry" },
            qty: { $first: "$qty" },
            sendQty: { $first: "$sendQty" },
            sendTotal: { $first: "$sendTotal" },
            total: { $first: "$total" },
            unitDetails: { $first: "$unitDetails" },
          },
        },
      ];

      PastryOrder.aggregate(cond).exec((err, items) => {
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

  updateStatus: (req, res, next) => {
    try {
      var pId = req.params.order;
      var bodyData = req.body;
      const status = parseInt(bodyData.status);
      let statusText = "";
      switch (status) {
        case 1:
          statusText = "Ordered";
          break;
        case 2:
          statusText = "Cancelled";
          break;
        case 3:
          statusText = "Completed";
          break;
        case 4:
          statusText = "Prepared";
          break;
        case 5:
          statusText = "Ready";
          break;
        case 6:
          statusText = "Picked";
        case 7:
          statusText = "Delivered";
        case 8:
          statusText = "Not delivered";
      }
      const timeLineBody = {
        statusText,
        status,
        orderId: pId,
        created_at: new Date(),
      };

      Order.updateOne(
        { _id: pId },
        { $set: { status: bodyData.status } },
        async (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            const timeLineInit = new timeLine(timeLineBody);
            await timeLineInit.save();

            res.status(200).json({
              message: messages.updateMsg("Order status"),
            });
          }
        }
      );
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  updatePastryAvailQty: (req, res, next) => {
    try {
      var pId = req.params.order;
      var bodyData = req.body;
      PastryOrder.updateOne(
        { _id: pId },
        {
          $set: {
            pastry: bodyData.pastry,
            sendTotal: bodyData.sendTotal,
            sendQty: bodyData.sendQty,
          },
        },
        (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(200).json({
              message: messages.updateMsg("Qty"),
            });
          }
        }
      );
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  updatePreparingUser: (req, res, next) => {
    try {
      var pId = req.params.order;
      var bodyData = req.body;

      Order.updateOne(
        { _id: pId },
        { $set: { prepared_by: bodyData.user } },
        (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            pushNotify.sendPushNotificationForOneUser(
              bodyData.user,
              "You have a new order to prepare",
              pId
            );

            res.status(200).json({
              message: messages.updateMsg("Order details"),
            });
          }
        }
      );
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  updateDeliveryUser: (req, res, next) => {
    try {
      var pId = req.params.order;
      var bodyData = req.body;

      Order.updateOne(
        { _id: pId },
        { $set: { delivery_man: bodyData.user } },
        (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            pushNotify.sendPushNotificationForOneUser(
              bodyData.user,
              "You have a new order to deliver",
              pId
            );

            res.status(200).json({
              message: messages.updateMsg("Order details"),
            });
          }
        }
      );
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  updateBalance: (req, res, next) => {
    try {
      var pId = req.params.order;
      var bodyData = req.body;
      Order.findById(pId, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else if (result) {
          var amount = parseFloat(result.amount);
          var advAmount = result.advance ? parseFloat(result.advance) : 0;
          var remaining = amount - advAmount;
          var balanceAmt = result.balance
            ? parseFloat(result.balance)
            : remaining;
          if (bodyData.balance > balanceAmt) {
            res.status(400).json({
              message: "Paid amount surpassed the balance amount",
            });
          } else {
            var balCal = balanceAmt - parseFloat(bodyData.balance);
            Order.updateOne(
              { _id: pId },
              { $set: { balance: balCal } },
              (err, modified) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else {
                  res.status(200).json({
                    message: messages.updateMsg("Balance updated!"),
                  });
                }
              }
            );
          }
        } else {
          res.status(404).json({
            message: "No such orders found",
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  deleteOrder: (req, res, next) => {
    try {
      var orderId = req.params.order;
      Order.deleteOne({ _id: orderId }, (err, d) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.deleteMsg("order"),
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  deletePastryOrder: (req, res, next) => {
    try {
      var orderId = req.params.order;
      PastryOrder.deleteOne({ _id: orderId }, (err, d) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.deleteMsg("order"),
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllNotifications: (req, res, next) => {
    try {
      notify.find({ is_viewed: false }, (err, messages) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: "success",
            data: messages,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  viewNotification: (req, res, next) => {
    try {
      var nId = req.params.id;

      notify.updateOne(
        { _id: nId },
        { $set: { is_viewed: true } },
        (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(200).json({
              message: messages.updateMsg("Order details"),
            });
          }
        }
      );
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getTodayDeliveryItems: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 5;
      var skip = currentPage * limit;
      const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));

      var cond = [];
      var sQuery = {
        $and: [
          { delivery_date: { $gte: startOfDay } },
          { status: { $ne: "2" } },
          { status: { $ne: "7" } },
        ],
      };

      cond = [
        {
          $match: sQuery,
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
        { $skip: skip },
        { $limit: limit },
      ];

      Order.aggregate(cond).exec((err, items) => {
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

  getOrderTrackingRecord: (req, res, next) => {
    try {
      var order = req.params.order;

      Order.findOne({ _id: order })
        .populate("delivery_man", { password: 0, deviceToken: 0 })
        .exec((err, orderD) => {
          if (err) {
            console.log(err);
            res.status(400).json({
              message: err.message,
            });
          } else if (orderD) {
            res.status(200).json({
              message: messages.getOneMsg,
              data: orderD,
            });
          } else {
            es.status(404).json({
              message: messages.noDataMsg,
            });
          }
        });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getSalesManReport: (req, res, next) => {
    try {
      const param = req.body;
      const query = {};
      let categoriesQ = {};
      let productQ = {};

      if (param.fromDate && param.toDate) {
        const sortOrder = param.fromDate;
        const sortOrder2 = param.toDate;
        const firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        const stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        query.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      } else if (param.fromDate) {
        const sortOrder = param.fromDate;
        const firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        query.created_at = {
          $gte: new Date(firstDate),
        };
      } else if (param.toDate) {
        const sortOrder = param.toDate;
        const firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        query.created_at = {
          $lte: new Date(firstDate),
        };
      }

      if (param.salemanId) {
        query.sales_man = new Mongoose.Types.ObjectId(param.salemanId);
      }

      if (param.selectedCategories && param.selectedCategories.length > 0) {
        const temp = [];

        param.selectedCategories.forEach((item) => {
          temp.push(new Mongoose.Types.ObjectId(item));
        });

        categoriesQ = {
          "filterProduct.category": { $in: temp },
        };
      }

      if (param.selectedProducts && param.selectedProducts.length > 0) {
        const temp = [];

        param.selectedProducts.forEach((item) => {
          temp.push(new Mongoose.Types.ObjectId(item));
        });
        productQ = {
          "filterProduct._id": { $in: temp },
        };
      }

      const cond = [
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products",
            localField: "product._id",
            foreignField: "_id",
            as: "filterProduct",
          },
        },
        {
          $unwind: {
            path: "$filterProduct",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: categoriesQ },
        {
          $match: productQ,
        },
        {
          $lookup: {
            from: "employees",
            localField: "sales_man",
            foreignField: "_id",
            as: "employees",
          },
        },
        {
          $project: {
            sales_man: 1,
            employees: 1,
            amount: { $trim: { input: "$amount" } },
          },
        },
        {
          $group: {
            _id: "$sales_man",
            employeeDetails: {
              $first: "$employees",
            },
            totalAmount: {
              $sum: {
                $toDecimal: "$amount",
              },
            },
            count: {
              $sum: 1,
            },
          },
        },
      ];

      Order.aggregate(cond).exec((err, items) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({ message: "ok", data: items });
        }
      });
    } catch (exp) {
      console.log(exp);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getChefsReport: (req, res, next) => {
    try {
      const param = req.body;
      const query = {
        prepared_by: {
          $exists: true,
          $ne: null,
        },
      };

      let categoriesQ = {};
      let productQ = {};

      if (param.fromDate && param.toDate) {
        const sortOrder = param.fromDate;
        const sortOrder2 = param.toDate;
        const firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        const stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        query.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      } else if (param.fromDate) {
        const sortOrder = param.fromDate;
        const firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        query.created_at = {
          $gte: new Date(firstDate),
        };
      } else if (param.toDate) {
        const sortOrder = param.toDate;
        const firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        query.created_at = {
          $lte: new Date(firstDate),
        };
      }

      if (param.chefId) {
        query.prepared_by = new Mongoose.Types.ObjectId(param.chefId);
      }

      if (param.selectedCategories && param.selectedCategories.length > 0) {
        const temp = [];

        param.selectedCategories.forEach((item) => {
          temp.push(new Mongoose.Types.ObjectId(item));
        });

        categoriesQ = {
          "filterProduct.category": { $in: temp },
        };
      }

      if (param.selectedProducts && param.selectedProducts.length > 0) {
        const temp = [];

        param.selectedProducts.forEach((item) => {
          temp.push(new Mongoose.Types.ObjectId(item));
        });
        productQ = {
          "filterProduct._id": { $in: temp },
        };
      }

      const cond = [
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products",
            localField: "product._id",
            foreignField: "_id",
            as: "filterProduct",
          },
        },
        {
          $unwind: {
            path: "$filterProduct",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: categoriesQ },
        {
          $match: productQ,
        },
        {
          $lookup: {
            from: "employees",
            localField: "prepared_by",
            foreignField: "_id",
            as: "employees",
          },
        },
        {
          $project: {
            prepared_by: 1,
            employees: 1,
            amount: { $trim: { input: "$amount" } },
          },
        },
        {
          $group: {
            _id: "$prepared_by",
            employeeDetails: {
              $first: "$employees",
            },
            totalAmount: {
              $sum: {
                $toDecimal: "$amount",
              },
            },
            count: {
              $sum: 1,
            },
          },
        },
      ];

      Order.aggregate(cond).exec((err, items) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({ message: "ok", data: items });
        }
      });
    } catch (exp) {
      console.log(exp);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllOrdersByChef: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 15;
      var skip = currentPage * limit;

      var categories = req.query.categories ? req.query.categories : [];
      var products = req.query.products ? req.query.products : [];
      var productQ = {};
      var categoriesQ = {};
      var chef = req.params.chef;

      var cond = [];
      var sQuery = {};

      if (chef) {
        sQuery.prepared_by = new Mongoose.Types.ObjectId(chef);
      }

      if (products && products.length > 0) {
        var newArr = [];
        products.forEach((element) => {
          newArr.push(new Mongoose.Types.ObjectId(element));
        });
        productQ = {
          "filterProduct._id": { $in: newArr },
        };
      }

      if (categories && categories.length > 0) {
        var newArrC = [];
        categories.forEach((element) => {
          newArrC.push(new Mongoose.Types.ObjectId(element));
        });
        categoriesQ = {
          "filterProduct.category": { $in: newArrC },
        };
      }

      if (req.query.sortBy) {
        var sortOrder = req.query.sortBy;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      if (req.query.sortByTo) {
        var sortOrder = req.query.sortByTo;
        var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
        sQuery.created_at = { $lte: new Date(stopDate) };
      }

      if (req.query.sortBy && req.query.sortByTo) {
        var sortOrder = req.query.sortBy;
        var sortOrder2 = req.query.sortByTo;
        var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
        var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
        sQuery.created_at = {
          $gte: new Date(firstDate),
          $lte: new Date(stopDate),
        };
      }

      cond = [
        {
          $match: sQuery,
        },
        {
          $lookup: {
            from: "products",
            localField: "product._id",
            foreignField: "_id",
            as: "filterProduct",
          },
        },
        {
          $unwind: {
            path: "$filterProduct",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: categoriesQ },
        {
          $match: productQ,
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
          $lookup: {
            from: "stores",
            localField: "branch",
            foreignField: "_id",
            as: "branchDetails",
          },
        },
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
            from: "ordertimelines",
            localField: "_id",
            foreignField: "orderId",
            as: "timeLineData",
          },
        },
        {
          $unwind: {
            path: "$timeLineData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            timelines: {
              $addToSet: "$timeLineData",
            },
            productDetails: {
              "$first":"$productDetails"
            },
            pastryDetails: {
              "$first":"$pastryDetails"
            },
            delivery_date: {
              "$first":"$delivery_date"
            },
            delivery_time: {
              "$first":"$delivery_time"
            },
            created_at: {
              "$first":"$created_at"
            },
            customer_name: {
              "$first":"$customer_name"
            },
            customer_phone: {
              "$first":"$customer_phone"
            },
            form_no: {
              "$first":"$form_no"
            }
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

      Order.aggregate(cond).exec((err, items) => {
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
};

module.exports = orderCalls;
