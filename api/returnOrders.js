var ReturnOrder = require("../models/ReturnOrdersModel");
var messages = require("../utils/messages");

var returnOrderCalls = {
  returnOrder: (req, res) => {
    try {
      const sQuery = {};
      const bodyData = req.body;
      const sortOrder = bodyData.return_date;
      let startDate = new Date(sortOrder);
      startDate = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(startDate).setHours(23, 59, 59, 999);
      sQuery.return_date = { $gte: new Date(startDate), $lt: new Date(end) };
      sQuery.created_by = req.decoded.id;

      ReturnOrder.findOne(sQuery, (err, returnOrder) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else if (returnOrder) {
          // update
          const _updateItems = returnOrder.pastry;

          bodyData.pastry.forEach((pastryItem) => {
            let newItem = true;
            _updateItems.forEach((item) => {
              if (item.p_id == pastryItem.p_id) {
                newItem = false;
                const oldQty = item.qty.concat(pastryItem.qty);
                item.qty = oldQty;
              }
            });

            if (newItem === true) {
              _updateItems.push(pastryItem);
            }
          });
          const updateData = { pastry: _updateItems };

          ReturnOrder.updateOne(
            { _id: returnOrder._id },
            updateData,
            (err, result) => {
              if (err) {
                res.status(400).json({
                  message: err.message,
                });
              } else {
                res.status(200).json({
                  message: messages.saveMsg("Return order"),
                });
              }
            }
          );
        } else {
          const returnItem = new ReturnOrder(bodyData);
          returnItem.created_by = req.decoded.id;

          returnItem.save((err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(200).json({
                message: messages.saveMsg("Return order"),
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
};

module.exports = returnOrderCalls;
