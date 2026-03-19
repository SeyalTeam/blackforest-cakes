var PastryOrder = require("../models/PastriesModel");
var PastryPayment = require("../models/BranchOrdersPayment");
var Mongoose = require("mongoose");
var messages = require("../utils/messages");
var helpers = require("../utils/helpers");
var Employee = require("../models/EmployeeModel");
const { response } = require("express");
var async = require("async");
var config = require("../config/config");
var io = require("socket.io-client");
var socket = io.connect(config.socketURL, { reconnect: true });

var branchOrderCalls = {
  removeOneItem: (req, res) => {
    try {
      var sQuery = { bill_no: req.params.bill };
      console.log(req.params);
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllBranchEmployeeData: (req, res, next) => {
    try {
      Employee.find({ emptype: 4 }, "firstname lastname", (err, lists) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: lists,
          });
        }
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllLiveOrdersList: (req, res, next) => {
    var currentPage =
      req.query && req.query.page ? parseInt(req.query.page) : 0;
    var limit = 10;
    var skip = currentPage * limit;
    var sQuery = { bill_no: { $exists: true } };
    sQuery.created_by = new Mongoose.Types.ObjectId(req.decoded.id);

    if (req.query.status) {
      sQuery.bill_status = req.query.status;
    }

    if (req.query.createdDate) {
      var sortOrder = req.query.createdDate;
      let startDate = new Date(sortOrder);
      startDate = new Date(startDate).setHours(0, 0, 0, 0);
      sQuery.created_at = { $gte: new Date(startDate) };
    }

    if (req.query.createdDateEnd) {
      var sortOrder = req.query.createdDateEnd;
      var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
      sQuery.created_at = { $lte: new Date(stopDate) };
    }

    if (req.query.createdDate && req.query.createdDateEnd) {
      var sortOrder = req.query.createdDate;
      var sortOrder2 = req.query.createdDateEnd;
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
        $unwind: {
          path: "$pastry",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$bill_no",
          bill_status: { $first: "$bill_status" },
          pastry: { $addToSet: "$pastry" },
        },
      },
      {
        $project: {
          _id: 1,
          bill_status: 1,
          pastry: 1,
        },
      },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    PastryOrder.aggregate(cond).exec((err, items) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        var statusQ = {};

        if (req.query.branch) {
          statusQ.created_by = new Mongoose.Types.ObjectId(req.query.branch);
        }

        if (req.query.status) {
          statusQ.bill_status = req.query.status;
        }

        if (req.query.createdDate) {
          var sortOrder = req.query.createdDate;
          let startDate = new Date(sortOrder);
          startDate = new Date(startDate).setHours(0, 0, 0, 0);
          statusQ.created_at = { $gte: new Date(startDate) };
        }

        if (req.query.createdDateEnd) {
          var sortOrder = req.query.createdDateEnd;
          var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
          statusQ.created_at = { $lte: new Date(stopDate) };
        }

        if (req.query.createdDate && req.query.createdDateEnd) {
          var sortOrder = req.query.createdDate;
          var sortOrder2 = req.query.createdDateEnd;
          var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
          var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
          statusQ.created_at = {
            $gte: new Date(firstDate),
            $lte: new Date(stopDate),
          };
        }

        PastryOrder.countDocuments(statusQ, (err, response) => {
          {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            }
            {
              res.status(200).json({
                message: messages.getAllMsg,
                data: items,
                countOrder: response,
              });
            }
          }
        });
      }
    });
  },
  getOneBill: (req, res, next) => {
    var sQuery = { bill_no: req.params.bill };
    let addQuery = {};

    if (req.query.currBillStatus) {
      addQuery = { "pastry.status": req.query.currBillStatus };
    }

    if (req.query.createdDate) {
      var sortOrder = req.query.createdDate;
      let startDate = new Date(sortOrder);
      startDate = new Date(startDate).setHours(0, 0, 0, 0);
      sQuery.created_at = { $gte: new Date(startDate), };
    }

    if (req.query.createdDateEnd) {
      var sortOrder = req.query.createdDateEnd;
      var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
      sQuery.created_at = { $lte: new Date(stopDate) };
    }

    if (req.query.createdDate && req.query.createdDateEnd) {
      var sortOrder = req.query.createdDate;
      var sortOrder2 = req.query.createdDateEnd;
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
        $unwind: {
          path: "$pastry",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: addQuery },
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
        $unwind: {
          path: "$employees",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$bill_no",
          created_by: { $first: "$created_by" },
          created_at: { $first: "$created_at" },
          pastryDetails: {
            $push: {
              info: "$pastryDetails",
              orderId: "$_id",
            },
          },
          pastries: { $addToSet: { data: "$pastry", orderId: "$_id" } },
          pastry: { $addToSet: "$pastry" },
          employees: { $first: "$employees" },
        },
      },
      {
        $project: {
          _id: 1,
          created_by: 1,
          created_at: 1,
          pastryDetails: 1,
          employees: 1,
          pastries: 1,
          pastry: 1,
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
  },

  confirmBillReceived: (req, res, next) => {
    const { body } = req;
    PastryOrder.findById({ _id: new Mongoose.Types.ObjectId(body.order) }).exec(
      (err, data) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
          return false;
        }
        const updatedPastries = data.pastry.map((i) => {
          if (i._id == body._id) {
            i.isReceived = 2;
            i.ackQty  = body.ackQuantity;
            i.receivedTime = new Date();
          }
          return i;
        });

        PastryOrder.updateOne(
          { _id: new Mongoose.Types.ObjectId(body.order) },
          {
            $set: {
              pastry: updatedPastries,
            },
          },
          (err, processed) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
              return false;
            }

            res.status(200).json({
              message: messages.saveMsg,
            });
          }
        );
      }
    );
  },

  updateBill: async (req, res) => {
    var data = req.body;
    let billNo = "";
    if (data.length > 0) {
      async.eachSeries(
        data,
        function updateObject(orderedItem, done) {
          PastryOrder.findById(orderedItem.orderId, async (err, response) => {
            if (response) {
              billNo = response.bill_no;
              response.pastry.forEach(async (pastry) => {
                if (pastry._id == orderedItem.data._id) {
                  if (orderedItem.data.isActive === true) {
                    let inStocks = orderedItem.data.inStock
                      ? parseFloat(orderedItem.data.inStock)
                      : "";

                    let sendQty = parseFloat(orderedItem.data.sendQty);
                    let sendTotal =
                      parseFloat(orderedItem.data.sendQty) *
                      parseFloat(orderedItem.data.price);

                    response.pastry.forEach((_d) => {
                      if (_d._id == pastry._id) {
                      } else {
                        sendTotal += parseFloat(_d.sendTotal);
                        sendQty += parseFloat(_d.sendQty);
                      }
                    });

                    PastryOrder.updateOne(
                      {
                        _id: orderedItem.orderId,
                        pastry: { $elemMatch: { _id: orderedItem.data._id } },
                      },
                      {
                        $set: {
                          sendQty: sendQty,
                          sendTotal: sendTotal,
                          "pastry.$.inStock": inStocks,
                          "pastry.$.sendTotal":
                            parseFloat(orderedItem.data.sendQty) *
                            parseFloat(orderedItem.data.price),
                          "pastry.$.sendQty": parseFloat(
                            orderedItem.data.sendQty
                          ),
                        },
                      },
                      { safe: true },
                      done
                    );
                  } else {
                    let sendQty = 0;
                    let sendTotal = 0;

                    response.pastry.forEach((_d) => {
                      if (_d._id == pastry._id) {
                      } else {
                        sendTotal += parseFloat(_d.sendTotal);
                        sendQty += parseFloat(_d.sendQty);
                      }
                    });
                    //remove from array
                    let doc = await PastryOrder.findOneAndUpdate(
                      { _id: orderedItem.orderId },
                      {
                        $set: { sendQty: sendQty, sendTotal: sendTotal },
                        $pull: { pastry: { _id: orderedItem.data._id } },
                      },
                      {
                        new: true,
                      }
                    );

                    if (doc && doc.pastry.length <= 0) {
                      //delete the order if have only one
                      PastryOrder.deleteOne({ _id: orderedItem.orderId }, done);
                    } else {
                      done();
                    }
                  }
                }
              });
            }
          });
        },
        function allDone(err) {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            PastryOrder.find({ bill_no: billNo }, (err, results) => {
              if (err) {
              } else {
                let fullPrice = 0;
                if (results.length > 0) {
                  results.forEach((_item) => {
                    _item.pastry.forEach((_itemPastry) => {
                      fullPrice += parseFloat(_itemPastry.sendTotal);
                    });
                  });
                }
                PastryPayment.findOne(
                  {
                    bill_no: billNo,
                  },
                  (err, payments) => {
                    if (payments) {
                      let paidAmt = 0;
                      let alreadyPaid = false;
                      if (
                        payments.invoiceBreakUp &&
                        payments.invoiceBreakUp.length > 0
                      ) {
                        alreadyPaid = true;
                        payments.invoiceBreakUp.forEach((element) => {
                          paidAmt += parseFloat(element.paid);
                        });
                      }
                      PastryPayment.updateOne(
                        { bill_no: billNo },
                        {
                          $set: {
                            price: fullPrice,
                            balance:
                              alreadyPaid === true
                                ? fullPrice - paidAmt
                                : fullPrice,
                          },
                        },
                        (err, processed) => {}
                      );
                    }
                  }
                );
              }
            });
            socket.emit("order_item_update");
            res.status(200).json({
              message: messages.getAllMsg,
            });
          }
        }
      );
    } else {
      res.status(404).json({
        message: "No data found",
      });
    }
  },
};
module.exports = branchOrderCalls;
