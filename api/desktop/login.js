var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
var messages = require("../../utils/messages");
var { validationResult } = require("express-validator");
var Employee = require("../../models/EmployeeModel");
var config = require("../../config/config");

var loginCalls = {
  makeLogin: (req, res) => {
    try {
      var bodyData = req.body;
      var errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array(),
        });
      } else {
        Employee.findOne({ username: bodyData.username }).populate('branch').exec((err, user) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else if (user) {
            if (user.emptype === 4) {
              bcrypt.compare(bodyData.password, user.password).then((match) => {
                if (match) {
                  var payload = { user: user.firstname, id: user._id };
                  var options = { expiresIn: config.tokenExpDays };
                  var secret = config.jwtSecretKey;
                  var token = jwt.sign(payload, secret, options);
                  var resBody = {
                    fname: user.firstname,
                    lname: user.lastname,
                    branch: user.branch._id,
                    branchName: user.branch.branch,
                    branchMobile: user.branch.phone,
                    user: user._id,
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
                message: "Kindly login as branch admin.",
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
      console.log(exp)
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  cashierLogin: (req, res) => {
    try {
      var bodyData = req.body;

      Employee.findOne({ emptype: 5, empcode: bodyData.code }, "firstname empcode isLoginNow branch", (err, collection) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else if (collection) {
          if (bodyData.branch == bodyData.branch) {

            if (collection.isLoginNow && collection.isLoginNow === true && bodyData.force === false) {
              res.status(401).json({
                message: 'ALREADY_LOGGED',
              });
            } else {
              var updateData = {
                isLoginNow: true,
              };

              Employee.updateOne({ empcode: bodyData.code }, updateData, (err, result) => {
                if (err) {
                  res.status(400).json({
                    message: err.message
                  });
                } else {
                  res.status(200).json({
                    message: 'ok'
                  });
                }
              })
            }
          } else {
            res.status(401).json({
              message: 'Cashier  not belongs to this branch',
            });
          }


        } else {
          res.status(404).json({
            message: messages.noDataMsg,
          });
        }
      });
    } catch (exp) {
      console.log(exp)
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  cashierLogout: (req, res) => {
    try {
      var bodyData = req.body;
      var updateData = {
        isLoginNow: false,
      };
      Employee.updateOne({ empcode: bodyData.code }, updateData, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else {
          res.status(200).json({
            message: 'ok'
          });
        }
      })
    } catch (exp) {
      console.log(exp)
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  }
};
module.exports = loginCalls;
