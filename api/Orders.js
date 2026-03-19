var Order = require("../models/OrderModel");
var PasryOrder = require("../models/PastriesModel");
var StockOrder = require("../models/StockordersModel");
var PastryPayments = require("../models/BranchOrdersPayment");
var StockPayments = require("../models/StockOrderPayments");
var Store = require("../models/StoreModel");
var Mongoose = require("mongoose");
var messages = require("../utils/messages");
var pusher = require("../config/notify");
var notify = require("../models/NotificationModel");
var Employee = require("../models/EmployeeModel");
var pushNotify = require("../utils/notification");
var config = require("../config/config");
var io = require("socket.io-client");
var socket = io.connect(config.socketURL, { reconnect: true });
var accountSid = config.twiloSid; // Your Account SID from www.twilio.com/console
var authToken = config.twiloAuthToken; // Your Auth Token from www.twilio.com/console
const twiloClient = require("twilio")(accountSid, authToken);
var timeLine = require("../models/OrderTimeLineModel");

var orderCalls = {
  createOrder: (req, res, next) => {
    try {
      var bodyData = req.body;
      var createOrder = new Order(bodyData);
      createOrder.save((err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          const notifyData = {
            order_id: result._id,
            title: result.cake_model
              ? "you have new order for " + result.cake_model
              : "You have new order",
          };

          const createNotification = new notify(notifyData);
          createNotification.save((err, rec) => {
            if (err) {
              console.log(err);
            } else {
              pusher.trigger("my-channel", "my-event", {});
            }
          });

          res.status(201).json({
            message: messages.saveMsg("Order"),
            order: result._id,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  createPastryOrder: (req, res, next) => {
    try {
      var bodyData = req.body;
      if (bodyData.isStockOrder && bodyData.isStockOrder === true) {
        StockOrder.findOne(
          { bill_status: "1", created_by: req.decoded.id },
          (_err, activeBills) => {
            if (_err) {
              res.status(400).json({
                message: _err.message,
              });
            } else if (activeBills && activeBills.bill_no) {
              bodyData.created_by = req.decoded.id;
              bodyData.sendTotal = bodyData.total;
              bodyData.sendQty = bodyData.qty;
              bodyData.bill_status = "1";
              bodyData.bill_no = activeBills.bill_no;

              bodyData.pastry.forEach((_d) => {
                _d.sendTotal = _d.total;
                _d.sendQty = _d.qty;
                _d.status = "1";
                _d.delivery_date = bodyData.delivery_date;
                _d.delivery_time = bodyData.delivery_time;
              });

              var createOrder = new StockOrder(bodyData);

              createOrder.save((err, result) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else {
                  StockPayments.findOne(
                    { bill_no: result.bill_no },
                    (err, paymentSave) => {
                      if (err) {
                        console.log(err);
                      } else if (paymentSave) {
                        const oldBalance = paymentSave.balance;
                        const newBal =
                          parseFloat(oldBalance) + parseFloat(result.sendTotal);

                        StockPayments.updateOne(
                          { bill_no: paymentSave.bill_no },
                          {
                            balance: newBal,
                            price:
                              parseFloat(paymentSave.price) +
                              parseFloat(result.sendTotal),
                          },
                          (err, result) => {
                            if (err) {
                              console.log(err);
                            }
                          }
                        );
                      } else {
                        const payemnt = {
                          price: result.sendTotal,
                          balance: result.sendTotal,
                          status: "1",
                          invoiceBreakUp: [],
                          bill_no: result.bill_no,
                        };

                        const createPayment = new StockPayments(payemnt);

                        createPayment.save((err, saved) => {
                          if (err) {
                            console.log(err);
                          }
                        });
                      }
                    }
                  );

                  res.status(201).json({
                    message: messages.saveMsg("Order"),
                    order: result._id,
                  });
                }
              });
            } else {
              Employee.findById(req.decoded.id)
                .populate("branch")
                .exec((err, data) => {
                  if (err) {
                    res.status(400).json({
                      message: err.message,
                    });
                  } else {
                    let shortCode = "ST-O";
                    if (data.branch && data.branch.branch) {
                      shortCode = data.branch.branch.slice(0, 3).toUpperCase();
                    }
                    bodyData.created_by = req.decoded.id;
                    bodyData.sendTotal = bodyData.total;
                    bodyData.sendQty = bodyData.qty;
                    bodyData.bill_status = "1";
                    bodyData.bill_no =
                      shortCode +
                      "-" +
                      Math.floor(new Date().getTime() / 1000).toString();

                    bodyData.pastry.forEach((_d) => {
                      _d.sendTotal = _d.total;
                      _d.sendQty = _d.qty;
                      _d.status = "1";
                      _d.delivery_date = bodyData.delivery_date;
                      _d.delivery_time = bodyData.delivery_time;
                    });

                    var createOrder = new StockOrder(bodyData);

                    createOrder.save((err, result) => {
                      if (err) {
                        res.status(400).json({
                          message: err.message,
                        });
                      } else {
                        const payemnt = {
                          price: result.sendTotal,
                          balance: result.sendTotal,
                          status: "1",
                          invoiceBreakUp: [],
                          bill_no: result.bill_no,
                        };

                        const createPayment = new StockPayments(payemnt);

                        createPayment.save((err, saved) => {
                          if (err) {
                            res.status(400).json({
                              message: err.message,
                            });
                          } else {
                            res.status(201).json({
                              message: messages.saveMsg("Order"),
                              order: result._id,
                            });
                          }
                        });
                      }
                    });
                  }
                });
            }
          }
        );
      } else {
        PasryOrder.findOne(
          { bill_status: "1", created_by: req.decoded.id },
          (_err, activeBills) => {
            if (_err) {
              console.log(_err);
              res.status(400).json({
                message: _err.message,
              });
            } else if (activeBills && activeBills.bill_no) {
              bodyData.created_by = req.decoded.id;
              bodyData.sendTotal = bodyData.total;
              bodyData.sendQty = bodyData.qty;
              bodyData.bill_status = "1";
              bodyData.bill_no = activeBills.bill_no;

              bodyData.pastry.forEach((_d) => {
                _d.sendTotal = _d.total;
                _d.sendQty = _d.qty;
                _d.status = "1";
                // _d.delivery_date = new Date();
              });

              var createOrder = new PasryOrder(bodyData);

              createOrder.save((err, result) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else {
                  PastryPayments.findOne(
                    { bill_no: result.bill_no },
                    (err, paymentSave) => {
                      if (err) {
                        console.log(err);
                      } else if (paymentSave) {
                        const oldBalance = paymentSave.balance;
                        const newBal =
                          parseFloat(oldBalance) + parseFloat(result.sendTotal);

                        PastryPayments.updateOne(
                          { bill_no: paymentSave.bill_no },
                          {
                            balance: newBal,
                            price:
                              parseFloat(paymentSave.price) +
                              parseFloat(result.sendTotal),
                          },
                          (err, result) => {
                            if (err) {
                              console.log(err);
                            }
                          }
                        );
                      } else {
                        const payemnt = {
                          price: result.sendTotal,
                          balance: result.sendTotal,
                          status: "1",
                          invoiceBreakUp: [],
                          bill_no: result.bill_no,
                        };

                        const createPayment = new PastryPayments(payemnt);

                        createPayment.save((err, saved) => {
                          if (err) {
                            console.log(err);
                          }
                        });
                      }
                    }
                  );

                  // socket notification goes here
                  Employee.findById(req.decoded.id).exec((err, data) => {
                    if (err) {
                    } else {
                      socket.emit("new_order_received", data.firstname);
                    }
                  });

                  res.status(201).json({
                    message: messages.saveMsg("Order"),
                    order: result._id,
                  });
                }
              });
            } else {
              bodyData.created_by = req.decoded.id;
              bodyData.sendTotal = bodyData.total;
              bodyData.sendQty = bodyData.qty;
              bodyData.bill_status = "1";

              bodyData.pastry.forEach((_d) => {
                _d.sendTotal = _d.total;
                _d.sendQty = _d.qty;
                _d.status = "1";
                // _d.delivery_date = new Date();
              });

              Employee.findById(req.decoded.id)
                .populate("branch")
                .exec((err, data) => {
                  if (err) {
                    res.status(400).json({
                      message: err.message,
                    });
                  } else {
                    let shortCode = "BR-O";
                    if (data.branch && data.branch.branch) {
                      shortCode = data.branch.branch.slice(0, 3).toUpperCase();
                    }

                    bodyData.bill_no =
                      shortCode +
                      "-" +
                      Math.floor(new Date().getTime() / 1000).toString();
                    var createOrder = new PasryOrder(bodyData);

                    createOrder.save((err, result) => {
                      if (err) {
                        res.status(400).json({
                          message: err.message,
                        });
                      } else {
                        const payemnt = {
                          price: result.sendTotal,
                          balance: result.sendTotal,
                          status: "1",
                          invoiceBreakUp: [],
                          bill_no: result.bill_no,
                        };

                        const createPayment = new PastryPayments(payemnt);

                        createPayment.save((err, saved) => {
                          if (err) {
                            res.status(400).json({
                              message: err.message,
                            });
                          } else {
                            // socket notification goes here

                            socket.emit("new_order_received", data.firstname);

                            res.status(201).json({
                              message: messages.saveMsg("Order"),
                              order: result._id,
                            });
                          }
                        });
                      }
                    });
                  }
                });
            }
          }
        );
      }
    } catch (exp) {
      console.log(exp);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllOrdersByBranch: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 10;
      var skip = currentPage * limit;

      var cond = [];
      let sQuery = {};

      if (req.query && parseInt(req.query.type) === 1 && req.decoded.id) {
        sQuery.sales_man = new Mongoose.Types.ObjectId(req.decoded.id);
      }

      if (req.query && parseInt(req.query.type) === 2 && req.decoded.id) {
        // sQuery.prepared_by = new Mongoose.Types.ObjectId(req.decoded.id);
        sQuery = {
          $or: [
            { prepared_by: { $exists: false } },
            { prepared_by: new Mongoose.Types.ObjectId(req.decoded.id) },
          ],
        };
      }

      if (req.query.status) {
        sQuery.status = req.query.status;
      }

      if (req.query.branch) {
        sQuery.branch = new Mongoose.Types.ObjectId(req.query.branch);
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
        {
          $lookup: {
            from: "employees",
            localField: "prepared_by",
            foreignField: "_id",
            as: "preparedUser",
          },
        },
        {
          $unwind: {
            path: "$preparedBy",
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
        { $sort: { status: 1, delivery_date: 1, delivery_time: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];

      Order.aggregate(cond).exec((err, items) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          var statusQ = {};

          if (req.query.status) {
            statusQ.status = req.query.status;
          }

          if (req.query && parseInt(req.query.type) === 1 && req.decoded.id) {
            statusQ.sales_man = new Mongoose.Types.ObjectId(req.decoded.id);
          }

          if (req.query && parseInt(req.query.type) === 2 && req.decoded.id) {
            // statusQ.prepared_by = new Mongoose.Types.ObjectId(req.decoded.id);
            statusQ = {
              $or: [
                { prepared_by: { $exists: false } },
                { prepared_by: new Mongoose.Types.ObjectId(req.decoded.id) },
              ],
            };
          }

          Order.countDocuments(statusQ, (err, response) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAllOrdersByEmp: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 20;
      var skip = currentPage * limit;
      var emp = req.decoded.id;
      let dateNow = new Date();
      let prevDate = dateNow.setMonth(dateNow.getMonth() - 1);
      prevDate = prevDate ? new Date(prevDate) : new Date();

      var cond = [];
      var sQuery = { sales_man: new Mongoose.Types.ObjectId(emp) };
      sQuery.created_at = { $gt: prevDate };

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
        { $sort: { created_at: -1 } },
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

  getAllOrdersByDeliveryEmp: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 20;
      var skip = currentPage * limit;
      var emp = req.decoded.id;

      var cond = [];
      var sQuery = {
        delivery_man: new Mongoose.Types.ObjectId(emp),
        status: "7",
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
        {
          $group: {
            _id: {
              month: { $month: "$delivery_date" },
            },
            orderDetails: {
              $push: {
                product: "$productDetails",
                pastry: "$pastryDetails",
                id: "$_id",
                amount: "$amount",
                deliveryDate: "$delivery_date",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.month": -1 } },
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

  getOrderById: (req, res, next) => {
    try {
      var pId = req.params.id;
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

  updateStatus: (req, res, next) => {
    try {
      var pId = req.params.id;
      var bodyData = req.body;

      Order.updateOne(
        { _id: pId },
        { $set: { status: bodyData.status } },
        async (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            //admin notify
            const notifyData = {
              order_id: pId,
              title: "An order status updated.Please check.",
            };
            const createNotification = new notify(notifyData);
            createNotification.save((err, rec) => {
              if (err) {
                console.log(err);
              } else {
                pusher.trigger("my-channel", "my-event", {});
              }
            });
            let statusText = "";
            switch (parseInt(bodyData.status)) {
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
              status: bodyData.status,
              orderId: pId,
              created_at: new Date(),
            };
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

  updateBalance: (req, res, next) => {
    try {
      var pId = req.params.id;
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

  getAllBranches: (req, res, next) => {
    try {
      Store.find({}, (err, stores) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: "success",
            data: stores,
          });
        }
      });
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
            // send push notification to chef if assigned
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

  deliverOrder: (req, res, next) => {
    try {
      var pId = req.params.order;
      var bodyData = req.body;

      Order.updateOne(
        { _id: pId },
        { $set: { rating: bodyData.rating, status: "7", balance: "0" } },
        (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            //admin notify
            const notifyData = {
              order_id: pId,
              title: "Order delivered.",
            };

            const createNotification = new notify(notifyData);

            createNotification.save((err, rec) => {
              if (err) {
                console.log(err);
              } else {
                pusher.trigger("my-channel", "my-event", {});
              }
            });

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
      var emp = req.decoded.id;
      const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999));

      var cond = [];
      var sQuery = {
        delivery_man: new Mongoose.Types.ObjectId(emp),
        $and: [
          { delivery_date: { $gte: startOfDay } },
          { delivery_date: { $lte: endOfDay } },
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
      Order.countDocuments(sQuery, (Err, count) => {
        if (Err) {
          res.status(400).json({
            message: Err.message,
          });
        } else {
          Order.aggregate(cond).exec((err, items) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(200).json({
                message: messages.getAllMsg,
                data: items,
                totalItems: count,
              });
            }
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getPendingDeliveryItems: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 5;
      var skip = currentPage * limit;
      var emp = req.decoded.id;
      const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));

      var cond = [];
      var sQuery = {
        delivery_man: new Mongoose.Types.ObjectId(emp),
        $and: [
          { delivery_date: { $lte: startOfDay } },
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
      Order.countDocuments(sQuery, (Err, count) => {
        if (Err) {
          res.status(400).json({
            message: Err.message,
          });
        } else {
          Order.aggregate(cond).exec((err, items) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(200).json({
                message: messages.getAllMsg,
                data: items,
                totalItems: count,
              });
            }
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getUpcomingDeliveryItems: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 5;
      var skip = currentPage * limit;
      var emp = req.decoded.id;
      const endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999));

      var cond = [];
      var sQuery = {
        delivery_man: new Mongoose.Types.ObjectId(emp),
        $and: [
          { delivery_date: { $gte: endOfDay } },
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
      Order.countDocuments(sQuery, (Err, count) => {
        if (Err) {
          res.status(400).json({
            message: Err.message,
          });
        } else {
          Order.aggregate(cond).exec((err, items) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(200).json({
                message: messages.getAllMsg,
                data: items,
                totalItems: count,
              });
            }
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  fileUpload: (req, res, next) => {
    try {
      var files = req.file;
      var orderId = req.params.order;
      if (files) {
        Order.findOneAndUpdate(
          { _id: orderId },
          { $set: { order_doc: files.filename } },
          (err, response) => {
            if (err) {
              console.log(err, "File upload Error");
              res.status(400).json({
                message: err.message,
              });
            } else {
              console.log("File Uploaded");
            }
            // updated
            // twiloClient.messages
            //   .create({
            //     // mediaUrl: [config.ApiUrlHost + "/orders/" + files.filename],
            //     mediaUrl: [
            //       "http://159.89.164.114:3001/orders/order-doc-1604309555781.jpg",
            //     ],
            //     from: "whatsapp:+12058963273",
            //     body:
            //       "Thank you for visiting the black forest cakes.Please come again",
            //     to: "whatsapp:+919080397884",
            //   })
            //   .then(
            //     (message) => {
            //       console.log(message.sid, "step1");
            //     },
            //     (err) => {
            //       console.log(err);
            //     }
            //   );
          }
        );
      }
    } catch (exp) {
      console.log(exp);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
};

module.exports = orderCalls;
