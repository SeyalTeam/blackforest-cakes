var messages = require("../../utils/messages");
var Sales = require("../../models/SalesModel");
var SequenceModel = require("../../models/SequenceModel");
const moment = require("moment"); // require
var Mongoose = require("mongoose");

var orderCalls = {
  createOrder: async (req, res, next) => {
    try {
      const bodyParams = req.body;
      // var billno = 'B' + bodyParams.branchName.substring(0, 3) + Date.now();
      // bodyParams.billNo = billno;
      bodyParams.orderDate = moment().format('YYYY-MM-DD');

      if (!bodyParams.salesLoginBy) {
        res.status(400).json({
          message: 'Branch manager approval required!',
        });
        return false;
      }

      if (!bodyParams.branch) {
        res.status(400).json({
          message: 'Branch is not allocated for this employee!Please contact administrator.',
        });
        return false;
      }

      if (!bodyParams.cashier) {
        res.status(400).json({
          message: 'Cashier must required!',
        });
        return false;
      }

      const getSequence = await SequenceModel.findOne({ branch: bodyParams.branch }).sort({sequence: -1});
      let sequence = 1;

      if (getSequence) {
        sequence = (parseInt(getSequence.sequence) + 1);
      }

      bodyParams.billNo = sequence;

      const createSequenceParam = {
        created_at: new Date(),
        branch: bodyParams.branch,
        sequence: sequence,
      };

      const createSeq = new SequenceModel(createSequenceParam);
      createSeq.save();
      const createOrder = new Sales(bodyParams);

      createOrder.save((err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(201).json({
            message: messages.saveMsg("Order"),
            order: result,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  cancelOrder: (req, res, next) => {
    try {
      var bodyParams = req.body;
      bodyParams.cancelled_on = new Date();
      bodyParams.isActive = false;

      var order = req.params.id;

      if (!bodyParams.cancelled_by) {
        res.status(400).json({
          message: 'Not allowed to cancel!',
        });
        return false;
      }

      Sales.findById(order, (err, data) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else if (data) {
          Sales.updateOne({ _id: order }, bodyParams, (err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            } else {
              res.status(200).json({
                message: messages.updateMsg('order'),
              });
            }
          })
        } else {
          res.status(404).json({
            message: 'Order not found'
          });
        }
      });

    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  listorders: (req, res, next) => {
    var currentPage =
      req.query && req.query.page ? parseInt(req.query.page) : 0;
    var limit = 10;
    var skip = currentPage * limit;
    var cashier = req.query.cashier ? req.query.cashier : "";
    var billNo = req.query.billNo ? req.query.billNo : "";
    var branch = req.query.branch ? req.query.branch : "";
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};

    if (cashier) {
      sQuery.waiter = new Mongoose.Types.ObjectId(cashier);
    }

    if (branch) {
      sQuery.branch = new Mongoose.Types.ObjectId(branch);
    }

    if (billNo) {
      sQuery.billNo = { $regex: billNo, $options: "i" };
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }

    const cond = [
      {
        $match: sQuery,
      },
      {
        $facet: {
          paginatedResults: [
            { $sort: { created_at: -1 } },
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      }
    ];

    Sales.aggregate(cond).exec((err, items) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        res.status(200).json({
          message: messages.getAllMsg,
          data: items[0].paginatedResults,
          currentPage: currentPage,
          total: items[0] && items[0].totalCount && items[0].totalCount[0] ? items[0].totalCount[0].count : 0
        });
      }
    });

  },
  updateOrder: (req, res, next) => {
    try {
      var bodyParams = req.body;
      var order = req.params.id;

      if (!bodyParams.salesLoginBy) {
        res.status(400).json({
          message: 'Branch manager approval required!',
        });
        return false;
      }

      if (!bodyParams.cashier) {
        res.status(400).json({
          message: 'Cashier must required!',
        });
        return false;
      }

      Sales.updateOne({ _id: order }, bodyParams, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else {
          Sales.findById(order, (err, data) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            } else {
              res.status(200).json({
                message: messages.updateMsg('order'),
                result: result,
                order: data
              });
            }
          });
        }

      })
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  reportByBill: (req, res, next) => {
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};
    var lgUser = req.query.salesMan ? req.query.salesMan : "";

    // var branch = req.query.branch ? req.query.branch : "";

    // if (branch) {
    //   sQuery.branch = new Mongoose.Types.ObjectId(branch);
    // }
    if (lgUser) {
      sQuery.salesLoginBy = new Mongoose.Types.ObjectId(lgUser);
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }

    var cond = [
      {
        $match: sQuery,
      },
      {
        $group: {
          "_id": "$salesLoginBy",
          totalCost: {
            "$sum": {
              "$toDouble": "$totalProductSellingPrice"
            }
          },
          netCost: {
            "$sum": {
              "$toDouble": "$netAmount"
            }
          },
          qty: {
            "$sum": 1
          }
        },
      },
      {
        "$project": {
          "_id": 1,
          "totalCost": 1,
          netCost: 1,
          qty: 1
        }
      }
    ];


    Sales.aggregate(cond).exec((err, items) => {
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


  },
  reportByProduct: (req, res, next) => {
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};

    var branch = req.query.branch ? req.query.branch : "";

    if (branch) {
      sQuery.branch = new Mongoose.Types.ObjectId(branch);
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }
    var prodFilter = {}
    if (req.query.product) {
      prodFilter = {
        "items._id": new Mongoose.Types.ObjectId(req.query.product),
      }
    }

    var cond = [
      {
        $match: sQuery,
      },
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: prodFilter
      },
      {
        $group: {
          _id: "$items._id",
          item: { $first: "$items.name" },
          item_id: { $first: "$items._id" },
          code: { $first: "$items.code" },
          catId: { $first: "$items.catId" },
          qty: {
            "$sum": {
              "$toDouble": "$items.qty"
            }
          },
          totalCost: {
            "$sum": {
              "$toDouble": "$items.totalCost"
            }
          },
          orderDate: { $first: "$orderDate" }
        },
      }
    ];



    Sales.aggregate(cond).exec((err, items) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        res.status(200).json({
          message: messages.getAllMsg,
          data: items
        });
      }
    });

  },
  reportByBranch: (req, res, next) => {
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};
    var branch = req.query.branch ? req.query.branch : "";
    if (branch) {
      sQuery.salesLoginBy = new Mongoose.Types.ObjectId(branch);
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }
    var cond = [
      {
        $match: sQuery,
      },
      {
        $lookup: {
          from: "employees",
          localField: "salesLoginBy",
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
        $lookup: {
          from: "stores",
          localField: "branch",
          foreignField: "_id",
          as: "store",
        },
      },
      {
        $unwind: {
          path: "$store",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          "_id": "$salesLoginBy",
          emp: { $first: "$salesMan" },
          totalCost: {
            "$sum": {
              "$toDouble": "$totalProductCostPrice"
            }
          },
          qty: { $sum: 1 },
          netCost: {
            "$sum": {
              "$toDouble": "$netAmount"
            }
          }
        },
      },
      {
        "$project": {
          "_id": 1,
          "totalCost": 1,
          discount: 1,
          netCost: 1,
          qty: 1,
          "emp._id": 1,
          "emp.firstname": 1,
        }
      }
    ];


    Sales.aggregate(cond).exec((err, items) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {

        res.status(200).json({
          message: messages.getAllMsg,
          data: items
        });
      }
    });
  },
  reportByTime: (req, res, next) => {
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};

    var branch = req.query.branch ? req.query.branch : "";

    if (branch) {
      sQuery.branch = new Mongoose.Types.ObjectId(branch);
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }

    var cond = [
      {
        $match: sQuery,
      },
      {
        "$project": {
          "h": {
            $hour: { date: "$created_at", timezone: "+05:30" }
          },
          "_id": 1,
          "netAmount": 1
        }
      },
      {
        $group: {
          "_id": { "hour": "$h" },
          count: { $sum: 1 },
          totalCost: {
            "$sum": {
              "$toDouble": "$netAmount"
            }
          }
        },
      },
      { $sort: { '_id.hour': 1 } }
    ];


    Sales.aggregate(cond).exec((err, items) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        let totalAmt = 0;

        if (items.length > 0) {
          items.forEach(i => {
            totalAmt = totalAmt + i.totalCost;
          });
        }
        res.status(200).json({
          message: messages.getAllMsg,
          data: items,
          totalCost: totalAmt
        });
      }
    });

  },
  reportBySalesMan: (req, res, next) => {
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};
    var salesLoginBy = req.query.salesMan ? req.query.salesMan : "";
    var loggedIn = req.query.loggedIn ? req.query.loggedIn : "";

    if (salesLoginBy) {
      sQuery.waiter = new Mongoose.Types.ObjectId(salesLoginBy);
    } else if (loggedIn) {
      sQuery.salesLoginBy = new Mongoose.Types.ObjectId(loggedIn);
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }


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
          totalCost: {
            "$sum": {
              "$toDouble": "$totalProductCostPrice"
            }
          },
          netCost: {
            "$sum": {
              "$toDouble": "$netAmount"
            }
          },
          qty: {
            "$sum": "$totalItems"
          }
        },
      },
      {
        "$project": {
          "_id": 1,
          "totalCost": 1,
          discount: 1,
          netCost: 1,
          qty: 1,
          "emp._id": 1,
          "emp.firstname": 1,
        }
      }
    ];

    Sales.aggregate(cond).exec((err, items) => {
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


  },
  reportByCashier: (req, res, next) => {
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};
    var cashier = req.query.cashier ? req.query.cashier : "";
    var salesLoginBy = req.query.loggedIn ? req.query.loggedIn : "";
    var branch = req.query.branch ? req.query.branch : "";

    if (cashier) {
      sQuery.cashier = new Mongoose.Types.ObjectId(cashier);
    } else if (salesLoginBy) {
      sQuery.salesLoginBy = new Mongoose.Types.ObjectId(salesLoginBy);
    }


    if (branch) {
      sQuery.branch = new Mongoose.Types.ObjectId(branch);
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }

    var cond = [
      {
        $match: sQuery,
      },
      {
        $lookup: {
          from: "employees",
          localField: "cashier",
          foreignField: "_id",
          as: "cashierDetails",
        },
      },
      {
        $unwind: {
          path: "$cashierDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "branch",
          foreignField: "_id",
          as: "store",
        },
      },
      {
        $unwind: {
          path: "$store",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          "_id": "$cashier",
          branchWise: {
            $push: {
              totalCost: {
                "$sum": {
                  "$toDouble": "$totalProductCostPrice"
                }
              },
              branch: "$branch",
              branchDetails: "$store",
              qty: { $sum: "$totalItems" },
            }
          },
          emp: { $first: "$cashierDetails" },
          totalCost: {
            "$sum": {
              "$toDouble": "$totalProductSellingPrice"
            }
          },
          discount: {
            "$sum": {
              "$toDouble": "$discount"
            }
          },
          netCost: {
            "$sum": {
              "$toDouble": "$netAmount"
            }
          },
          qty: {
            "$sum": "$totalItems"
          }
        },
      },
      {
        "$project": {
          "_id": 1,
          "totalCost": 1,
          branchWise: 1,
          discount: 1,
          netCost: 1,
          qty: 1,
          "emp._id": 1,
          "emp.firstname": 1,
        }
      }

    ];


    Sales.aggregate(cond).exec((err, items) => {
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



  },
  reportByGroup: (req, res, next) => {
    var currentPage =
      req.query && req.query.page ? parseInt(req.query.page) : 0;
    var limit = 10;
    var isExport = req.query.export;
    var skip = currentPage * limit;
    var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
    var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
    var sQuery = {};

    var branch = req.query.branch ? req.query.branch : "";

    if (branch) {
      sQuery.branch = new Mongoose.Types.ObjectId(branch);
    }

    if (orderFromDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      sQuery.orderDate = {
        $gte: new Date(firstDate),
      };
    }

    if (orderToDate) {
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
      sQuery.orderDate = {
        $lte: new Date(stopDate)
      };
    }

    if (orderFromDate && orderToDate) {
      var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
      var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
      sQuery.orderDate = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
    }

    var categoryQuery = {};

    if (req.query.catId) {
      categoryQuery = {
        "items.catId": new Mongoose.Types.ObjectId(req.query.catId),
      };
    }

    var cond = [
      {
        $match: sQuery,
      },
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: categoryQuery
      },
      {
        $lookup: {
          from: "productcategories",
          localField: "items.catId",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $group: {
          _id: "$items.catId",
          item: { $first: "$items.name" },
          item_id: { $first: "$items._id" },
          code: { $first: "$items.code" },
          categoryDetails: { $first: "$categoryDetails" },
          catId: { $first: "$items.catId" },
          qty: {
            "$sum": {
              "$toDouble": "$items.qty"
            }
          },
          totalCost: {
            "$sum": {
              "$toDouble": "$items.totalCost"
            }
          }
        },
      },
      {
        $facet: {
          paginatedResults: [
            // { $skip: skip },
            // { $limit: limit }
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      }
    ];

    if (isExport && isExport === 'pdf') {
      cond = [
        {
          $match: sQuery,
        },
        {
          $unwind: {
            path: "$items",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: categoryQuery
        },
        {
          $lookup: {
            from: "productcategories",
            localField: "items.catId",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $group: {
            _id: "$items.catId",
            item: { $first: "$items.name" },
            item_id: { $first: "$items._id" },
            code: { $first: "$items.code" },
            categoryDetails: { $first: "$categoryDetails" },
            catId: { $first: "$items.catId" },
            qty: {
              "$sum": {
                "$toDouble": "$items.qty"
              }
            },
            totalCost: {
              "$sum": {
                "$toDouble": "$items.totalCost"
              }
            },
          },
        },
      ];
    }

    Sales.aggregate(cond).exec((err, items) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        if (isExport && isExport === 'pdf') {
          res.status(200).json({
            message: messages.getAllMsg,
            data: items
          });
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: items[0].paginatedResults,
            currentPage: currentPage,
            total: items[0] && items[0].totalCount && items[0].totalCount[0] ? items[0].totalCount[0].count : 0
          });
        }
      }
    });
  },
  getOrderById: (req, res, next) => {
    try {
      var order = req.params.id;
      Sales.findById(order, (err, data) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else {
          res.status(200).json({
            message: messages.getOneMsg,
            data: data
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  }
};

module.exports = orderCalls;
