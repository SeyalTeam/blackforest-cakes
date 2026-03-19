const Order = require("../models/OrderModel");
const notify = require("../models/NotificationModel");
const pusher = require("../config/notify");
const moment = require("moment"); // require
const admin = require("../utils/firebase");
var Employee = require("../models/EmployeeModel");
var PastryOrder = require("../models/PastriesModel");
var StockOrder = require("../models/StockordersModel");

const fs = require("fs-extra");

const notificationCalls = {
  // send notification to admin, chef, waiter, delivery boy(if assigned) before one hour of delivery
  sendOneHourBeforeNotificationsToAll: () => {
    const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999));
    const sQuery = {
      $and: [
        { delivery_date: { $gte: startOfDay } },
        { delivery_date: { $lte: endOfDay } },
        { status: { $nin: [2, 6, 7] } },
      ],
    };

    Order.find(sQuery)
      .cursor({ batchSize: 20 })
      .eachAsync((order) => {
        var end = moment(order.delivery_time);
        var startTime = new moment();
        var userList = [];
        if (order.sales_man) {
          userList.push(order.sales_man);
        }

        if (order.delivery_man) {
          userList.push(order.delivery_man);
        }

        if (order.prepared_by) {
          userList.push(order.prepared_by);
        }

        var duration = moment.duration(end.diff(startTime));
        var hours = duration.asHours();
        if (hours.toFixed(3) == "1.000") {
          notificationCalls.sendAdminNotification(
            order,
            "You have an order to deliver in next one hour."
          );
          if (userList.length > 0) {
            notificationCalls.sendPushNotificationByUser(
              userList,
              "You have an order to deliver in next one hour.",
              order._id,
              "onehour"
            );
          }
        }
      });
  },

  // send notification to admin, chef, waiter, delivery boy(if assigned) before five min of delivery
  sendNotificationsToAll: () => {
    const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999));

    const sQuery = {
      $and: [
        { delivery_date: { $gte: startOfDay } },
        { delivery_date: { $lte: endOfDay } },
        { status: { $nin: [2, 6, 7] } },
      ],
    };

    Order.find(sQuery)
      .cursor({ batchSize: 20 })
      .eachAsync((order) => {
        var end = moment(order.delivery_time);
        var startTime = new moment();
        var userList = [];
        if (order.sales_man) {
          userList.push(order.sales_man);
        }

        if (order.delivery_man) {
          userList.push(order.delivery_man);
        }

        if (order.sales_man) {
          userList.push(order.prepared_by);
        }

        var duration = moment.duration(end.diff(startTime));
        var hours = duration.asMinutes();
        var toRound = Math.floor(hours);
        if (toRound === 5) {
          if (userList.length > 0) {
            notificationCalls.sendPushNotificationByUser(
              userList,
              "You have an order to deliver in next 5 minutes.",
              order._id,
              "fivemins"
            );
          }
          notificationCalls.sendAdminNotification(
            order,
            "You have an order to deliver in next 5 minutes."
          );
        } else if (toRound === 0) {
          if (userList.length > 0) {
            notificationCalls.sendPushNotificationByUser(
              userList,
              "This order is crossed the delivery time.",
              order._id,
              "delay"
            );
          }
          notificationCalls.sendAdminNotification(
            order,
            "This order is crossed the delivery time."
          );
        }
      });
  },

  // send notification to admin, chef, waiter, delivery boy(if assigned) every day morning
  sendEveryDayNotification: () => {
    const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999));

    const sQuery = {
      $and: [
        { delivery_date: { $gte: startOfDay } },
        { delivery_date: { $lte: endOfDay } },
        { status: { $nin: [2, 6, 7] } },
      ],
    };

    Order.find(sQuery)
      .cursor({ batchSize: 20 })
      .eachAsync((order) => {
        var userList = [];
        if (order.sales_man) {
          userList.push(order.sales_man);
        }

        if (order.delivery_man) {
          userList.push(order.delivery_man);
        }

        if (order.sales_man) {
          userList.push(order.prepared_by);
        }
        if (userList.length > 0) {
          notificationCalls.sendPushNotificationByUser(
            userList,
            "You have an order to deliver today.",
            order._id
          );
        }
        notificationCalls.sendAdminNotification(
          order,
          "You have an order to deliver today."
        );
      });
  },

  sendPushNotificationByUser: (users, content, order, sound) => {
    Employee.find({ _id: { $in: users } }, (err, usersData) => {
      if (err) {
        console.log(err);
      } else if (usersData.length > 0) {
        usersData.forEach((user) => {
          if (user.deviceToken) {
            const message = {
              notification: {
                title: "Remainder",
                body: content,
              },
              data: {
                payload: JSON.stringify({ order: order }), // string
              },
              android: {
                notification: {
                  title: "Remainder",
                  body: content,
                  sound: sound ? sound : "notify",
                  priority: "high",
                },
              },
              token: user.deviceToken,
            };
            admin
              .messaging()
              .send(message)
              .then((response) => {
                // Response is a message ID string.
                console.log("Successfully sent message:", response);
              })
              .catch((error) => {
                console.log("Error sending message:", error);
              });
          }
        });
      }
    });
  },

  sendPushNotificationForOneUser: (user, content, order) => {
    Employee.findOne({ _id: user }, (err, usersData) => {
      if (err) {
        console.log(err);
      } else if (usersData) {
        if (usersData.deviceToken) {
          const message = {
            notification: {
              title: "hello " + usersData.firstname,
              body: content,
            },
            data: {
              payload: JSON.stringify({ order: order }), // string
            },
            android: {
              notification: {
                title: "hello " + usersData.firstname,
                body: content,
                sound: "notify",
                priority: "high",
              },
            },
            token: usersData.deviceToken,
          };
          admin
            .messaging()
            .send(message)
            .then((response) => {
              // Response is a message ID string.
              console.log("Successfully sent message:", response);
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });
        }
      }
    });
  },
  sendForceLogoutNotification: (user) => {
    Employee.findOne({ _id: user }, (err, usersData) => {
      if (err) {
        console.log(err);
      } else if (usersData) {
        if (usersData.deviceToken) {
          const message = {
            notification: {
              title: "Alert! " + usersData.firstname,
              body:
                "You account has been blocked. Please contact administrator",
            },
            data: {
              payload: "logout",
            },
            android: {
              notification: {
                title: "Alert! " + usersData.firstname,
                body:
                  "You account has been blocked. Please contact administrator",
                sound: "notify",
                priority: "high",
              },
            },
            token: usersData.deviceToken,
          };
          admin
            .messaging()
            .send(message)
            .then((response) => {
              // Response is a message ID string.
              console.log("Successfully sent message:", response);
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });
        }
      }
    });
  },

  sendAdminNotification: (order, message) => {
    const notifyData = {
      order_id: order._id,
      title: message,
    };

    const createNotification = new notify(notifyData);
    createNotification.save((err, rec) => {
      if (err) {
        console.log(err);
      } else {
        pusher.trigger("my-channel", "my-event", {});
      }
    });
  },

  deleteOrderDocumentEveryMonth: () => {
    let dateNow = new Date();
    let prevDate;
    prevDate = dateNow.setMonth(dateNow.getMonth() - 1);
    var now = new Date().setHours(0, 0, 0, 0);
    prevDate = prevDate ? new Date(prevDate) : new Date(now);
    const sQuery = {
      created_at: { $lte: prevDate },
      order_doc: { $exists: true },
    };

    Order.find(sQuery)
      .cursor({ batchSize: 20 })
      .eachAsync((orderDoc) => {
        if (orderDoc.order_doc) {
          const path = "./uploads/orders/" + orderDoc.order_doc;
          fs.remove(path, (err) => {
            if (err) return console.log(err);
          });

          Order.updateOne(
            { _id: orderDoc._id },
            { $set: { order_doc: "" } },
            (err, modified) => {
              console.log(err);
            }
          );
        }
      });
  },

  updateBillStatusEveryDay: () => {
    try {
      //pastry status, status
      PastryOrder.find({}, (err, result) => {
        if (err) {
          res.status(400).json({
            message: error.message,
          });
        } else if (result.length > 0) {
          result.forEach((orders) => {
            if (orders.bill_status == "1") {
              PastryOrder.updateOne(
                { _id: orders._id },
                { $set: { bill_status: "2" } },
                (error, modified) => {
                  if (err) {
                    console.log(err);
                  }
                }
              );
            }
          });
        }
      });

      //stock order
      StockOrder.find({}, (err, result) => {
        if (err) {
          res.status(400).json({
            message: error.message,
          });
        } else if (result.length > 0) {
          result.forEach((orders) => {
            if (orders.bill_status == "1") {
              StockOrder.updateOne(
                { _id: orders._id },
                { $set: { bill_status: "2" } },
                (error, modified) => {
                  if (err) {
                    console.log(err);
                  }
                }
              );
            }
          });
        }
      });
    } catch (exp) {
      console.log(exp);
    }
  },
};

module.exports = notificationCalls;
