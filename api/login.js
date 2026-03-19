// packages
var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
var { validationResult } = require("express-validator");
var config = require("../config/config");
var io = require("socket.io-client");
var socket = io.connect(config.socketURL, { reconnect: true });

var Employee = require("../models/EmployeeModel");
var messages = require("../utils/messages");
var config = require("../config/config");

var loginCalls = {
  makeLogin: (req, res, next) => {
    try {
      var bodyData = req.body;
      var errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array(),
        });
      } else {
        Employee.findOne({ username: bodyData.username }, (err, user) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else if (user) {
            if (user.isEnable === true) {
              bcrypt.compare(bodyData.password, user.password).then((match) => {
                if (match) {
                  if (bodyData.deviceToken) {
                    loginCalls.updateUsetToken(user._id, bodyData.deviceToken);
                  }

                  var payload = { user: user.firstname, id: user._id };
                  var options = { expiresIn: config.tokenExpDays };
                  var secret = config.jwtSecretKey;
                  var token = jwt.sign(payload, secret, options);

                  var resBody = {
                    fname: user.firstname,
                    lname: user.lastname,
                    branch: user.branch,
                    type: user.emptype,
                    empcode: user.empcode,
                    token: token,
                  };

                  res.status(200).json({
                    message: "success",
                    data: resBody,
                  });
                } else {
                  res.status(401).json({
                    message: "Please check your email and password",
                  });
                }
              });
            } else {
              res.status(401).json({
                message: "Your account temporarly suspended.",
              });
            }
          } else {
            res.status(404).json({
              message: messages.noDataMsg,
            });
          }
        });
      }
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  updateUsetToken: (user, token) => {
    Employee.updateOne(
      { _id: user },
      { $set: { deviceToken: token } },
      (err, result) => {
        if (err) {
          console.log(err);
        } else if (user) {
          console.log("user token updated");
        } else {
          console.log("no user found");
        }
      }
    );
  },

  getAllEmployees: (req, res, next) => {
    try {
      Employee.find({ emptype: 1 }, "firstname empcode", (err, collection) => {
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

  doLogout: (req, res, next) => {
    var user = req.decoded.id;

    Employee.updateOne(
      { _id: user },
      { $set: { deviceToken: "", latitude: "", longitude: "" } },
      (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          socket.emit("location_update", "one user location updated");

          res.status(200).json({
            message: "user logged out",
          });
        }
      }
    );
  },
};

module.exports = loginCalls;
