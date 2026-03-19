var config = require("../config/config");
var jwt = require("jsonwebtoken");
var Mongoose = require("mongoose");

var helperFunc = {
  validateEmail: (email) => {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  },

  validateToken: (req, res, next) => {
    var authHead = req.headers.authorization;
    if (authHead) {
      var options = { expiresIn: config.tokenExpDays };
      var secret = config.jwtSecretKey;
      var token = req.headers.authorization.split(" ")[1]; //bearer

      try {
        var jt = jwt.verify(token, secret, options);
        req.decoded = jt;
        next();
      } catch (exp) {
        res.status(401).json({
          message: "Authentication failed",
        });
      }
    } else {
      res.status(401).json({
        message: "Authorization header required",
      });
    }
  },

  getFileExt: (filename) => {
    var ext = "";
    if (filename) {
      var ext = filename.split(".").pop();
    }
    return ext;
  },

  getTotalorders(items) {
    let total = 0;
    items.forEach((element) => {
      total = total + 1;
    });
    return total.toString();
  },
  getTotalPendingorders(items) {
    let total = 0;
    items.forEach((element) => {
      if (element.status == "1") total = total + 1;
    });
    return total.toString();
  },
  getTotalCompletedorders(items) {
    let total = 0;
    items.forEach((element) => {
      if (element.status == "2") total = total + 1;
    });
    return total.toString();
  },
  getTotalAmount(items) {
    let totalPrice = 0;
    items.forEach((element) => {
      const onePrice = element.price * element.sendQty;
      totalPrice = totalPrice + parseFloat(onePrice);
    });
    return totalPrice.toString();
  },
  getBrnachProductName(selected, items) {
    let name = "N/A ";
    items.forEach((element) => {
      if (
        element.info &&
        element.info._id &&
        element.info._id.toString() == selected._id.toString()
      ) {
        name = element.info.name;
      }
    });
    return name;
  },
};

module.exports = helperFunc;
