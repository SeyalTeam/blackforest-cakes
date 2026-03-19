var StockOrder = require("../models/StockordersModel");
var StockOrderPayment = require("../models/StockOrderPayments");
var Mongoose = require("mongoose");
var messages = require("../utils/messages");
var xl = require("excel4node");
var helpers = require("../utils/helpers");

var stockOrdersCall = {
  printStockOrders: (req, res) => {
    var additionalQuery = {};

    var sQuery = { bill_no: { $exists: true } };
    var productQ = {};
    var catQ={};

    if (req.query.bill) {
      sQuery.bill_no = req.query.bill;
    }

    if (req.query.branch) {
      sQuery.created_by = new Mongoose.Types.ObjectId(req.query.branch);
    }

    if (req.query.status) {
      // sQuery.bill_status = req.query.status;
      additionalQuery = { "pastry.status": req.query.status };
    }

    if (req.query.category && req.query.category.length > 0) {
      const catArr = [];

      req.query.category.forEach((item) => {
        catArr.push(new Mongoose.Types.ObjectId(item));
      });
      catQ = {
        "pastry.pastryDetails.category": { $in: catArr },
      };
      // sQuery.category = { $in: catArr };
    }

    if (req.query.filterProducts && req.query.filterProducts.length > 0) {
      const productArr = [];

      req.query.filterProducts.forEach((item) => {
        productArr.push(new Mongoose.Types.ObjectId(item));
      });
      productQ = {
        "pastry._id": { $in: productArr },
      };
    }

    if (req.query.orderfrom) {
      var sortOrder = req.query.orderfrom;
      let startDate = new Date(sortOrder);
      sQuery.created_at = { $gte: startDate };
    }

    if (req.query.orderto) {
      var sortOrder = req.query.orderto;
      let endDate = new Date(sortOrder);
      endDate = endDate.setDate(endDate.getDate() + 1);
      sQuery.created_at = { $lt: new Date(endDate) };
    }

    if (req.query.orderfrom && req.query.orderto) {
      var sortOrder = req.query.orderfrom;
      let startDate = new Date(sortOrder);
      var sortOrder = req.query.orderto;
      let endDate = new Date(sortOrder);
      endDate = endDate.setDate(endDate.getDate() + 1);
      sQuery.created_at = { $gte: startDate, $lt: new Date(endDate) };
    }

    if (req.query.deliveryDate) {
      var sortOrder = req.query.deliveryDate;
      let startDate = new Date(sortOrder);
      startDate = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(startDate).setHours(23, 59, 59, 999);
      sQuery.delivery_date = { $gte: new Date(startDate), $lt: new Date(end) };
    }

    if (req.query.deliveryDateTo) {
      var sortOrder = req.query.deliveryDateTo;
      var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
      sQuery.delivery_date = { $lte: new Date(stopDate) };
    }

    if (req.query.deliveryDate && req.query.deliveryDateTo) {
      var sortOrder = req.query.deliveryDate;
      var sortOrder2 = req.query.deliveryDateTo;
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
          as: "pastry.pastryDetails",
        },
      },
      {
        $unwind: {
          path: "$pastry.pastryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $match: catQ
      },
      {
        $lookup: {
          from: "employees",
          localField: "created_by",
          foreignField: "_id",
          as: "pastry.employees",
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
          _id: { category: "$category" },
          pastry: { $addToSet: "$pastry" },
        },
      },
      {
        $lookup: {
          from: "productcategories",
          localField: "_id.category",
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
    ];

    StockOrder.aggregate(cond).exec((err, items) => {
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

  removeOneItem: (req, res) => {
    try {
      const bodyData = req.body;
      StockOrder.findById(bodyData.order, (err, orders) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else if (orders) {
          if (orders.pastry && orders.pastry.length > 0) {
            const tempPastries = orders.pastry.filter((item) => {
              return item._id != bodyData.pastryId;
            });
            if (tempPastries.length === 0) {
              StockOrder.deleteOne({ _id: bodyData.order }, (err, success) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else {
                  res.status(200).json({
                    message: "removed",
                    refresh: true,
                  });
                }
              });
            } else {
              StockOrder.updateOne(
                { _id: bodyData.order },
                { $set: { pastry: tempPastries } },
                (err, success) => {
                  if (err) {
                    res.status(400).json({
                      message: err.message,
                    });
                  } else {
                    res.status(200).json({
                      message: "removed",
                      refresh: false,
                    });
                  }
                }
              );
            }
          } else {
            res.status(404).json({
              message: "No pastry found",
            });
          }
          // res.status(200).json({
          //   message: "ok",
          // });
        } else {
          res.status(404).json({
            message: messages.noDataMsg,
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
  getBillRecords: (req, res, next) => {
    var currentPage =
      req.query && req.query.page ? parseInt(req.query.page) : 0;
    var limit = 15;
    var skip = currentPage * limit;
    var productQ = {};
    var additionalQuery = {};
    var catQ = {};

    var sQuery = { bill_no: { $exists: true } };

    if (req.query.bill) {
      sQuery.bill_no = req.query.bill;
    }

    if (req.query.branch) {
      sQuery.created_by = new Mongoose.Types.ObjectId(req.query.branch);
    }

    // if (req.query.status) {
    //   sQuery.bill_status = req.query.status;
    // }
    if (req.query.status) {
      // sQuery.bill_status = req.query.status;
      additionalQuery = { "pastry.status": req.query.status };
    }

    if (req.query.category && req.query.category.length > 0) {
      const catArr = [];

      req.query.category.forEach((item) => {
        catArr.push(new Mongoose.Types.ObjectId(item));
      });
      catQ = {
        "pastryDetails.category": { $in: catArr },
      };
      // sQuery.category = { $in: catArr };
    }

    if (req.query.filterProducts && req.query.filterProducts.length > 0) {
      const productArr = [];

      req.query.filterProducts.forEach((item) => {
        productArr.push(new Mongoose.Types.ObjectId(item));
      });
      productQ = {
        "pastry._id": { $in: productArr },
      };
    }

    if (req.query.deliveryDate) {
      var sortOrder = req.query.deliveryDate;
      let startDate = new Date(sortOrder);
      startDate = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(startDate).setHours(23, 59, 59, 999);
      sQuery.delivery_date = { $gte: new Date(startDate), $lt: new Date(end) };
    }

    if (req.query.deliveryDateTo) {
      var sortOrder = req.query.deliveryDateTo;
      var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
      sQuery.delivery_date = { $lte: new Date(stopDate) };
    }

    if (req.query.createdDate) {
      var sortOrder = req.query.createdDate;
      let startDate = new Date(sortOrder);
      // startDate = new Date(startDate).setHours(0, 0, 0, 0);
      // const end = new Date(startDate).setHours(23, 59, 59, 999);
      sQuery.created_at = { $gte: new Date(startDate)  };
      
    }

    if (req.query.createdDateEnd) {
      var sortOrder = req.query.createdDateEnd;
      var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
      sQuery.created_at = { $lte: new Date(stopDate) };
    }

    if (req.query.deliveryDate && req.query.deliveryDateTo) {
      var sortOrder = req.query.deliveryDate;
      var sortOrder2 = req.query.deliveryDateTo;
      var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
      var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
      sQuery.delivery_date = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
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
        $match: productQ,
      },
      { $match: additionalQuery },

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
        $match: catQ,
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
          status: { $first: "$bill_status" },
          pastryDetails: {
            $push: {
              info: "$pastryDetails",
              orderId: "$_id",
            },
          },
          pastry: { $addToSet: "$pastry" },
          employees: { $first: "$employees" },
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          created_by: 1,
          created_at: 1,
          pastryDetails: 1,
          employees: 1,
          pastry: 1,
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

    StockOrder.aggregate(cond).exec((err, items) => {
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

  downloadPastryExcel: (req, res, next) => {
    try {
      // Create a new instance of a Workbook class
      var wb = new xl.Workbook();

      // Add Worksheets to the workbook
      var ws = wb.addWorksheet("Pastry Orders");

      var headStyle = wb.createStyle({
        font: {
          color: "#32100f",
          size: 16,
        },
      });

      // Set value of cell A1 to 100 as a number type styled with paramaters of style
      ws.cell(1, 1).string("S.No").style(headStyle);

      ws.cell(1, 2).string("Bill No").style(headStyle);

      ws.cell(1, 3).string("Total Ordered Items").style(headStyle);

      ws.cell(1, 4).string("Total Completed Items").style(headStyle);

      ws.cell(1, 5).string("Total Pending Items").style(headStyle);

      ws.cell(1, 6).string("Bill Amount").style(headStyle);

      ws.cell(1, 7).string("Branch").style(headStyle);

      ws.cell(1, 8).string("Items List").style(headStyle);

      var sQuery = { bill_no: { $exists: true } };

      if (req.query.bill) {
        sQuery.bill_no = req.query.bill;
      }

      if (req.query.branch) {
        sQuery.created_by = new Mongoose.Types.ObjectId(req.query.branch);
      }

      if (req.query.status) {
        sQuery.bill_status = req.query.status;
      }

      if (req.query.category) {
        sQuery.category = new Mongoose.Types.ObjectId(req.query.category);
      }

      if (req.query.deliveryDate) {
        var sortOrder = req.query.deliveryDate;
        let startDate = new Date(sortOrder);
        startDate = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(startDate).setHours(23, 59, 59, 999);
        sQuery.delivery_date = {
          $gte: new Date(startDate),
          $lt: new Date(end),
        };
      }

      if (req.query.createdDate) {
        var sortOrder = req.query.createdDate;
        let startDate = new Date(sortOrder);
        startDate = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(startDate).setHours(23, 59, 59, 999);
        sQuery.created_at = { $gte: new Date(startDate), $lt: new Date(end) };
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
            pastry: 1,
          },
        },
      ];

      StockOrder.aggregate(cond).exec((err, items) => {
        if (err) {
          console.log(err);

          res.status(400).json({
            message: err.message,
          });
        } else {
          var cellStart = 2;
          items.map((item, key) => {
            ws.cell(cellStart, 1).number(key + 1);

            ws.cell(cellStart, 2).string(item._id);

            ws.cell(cellStart, 3).string(helpers.getTotalorders(item.pastry));

            ws.cell(cellStart, 4).string(
              helpers.getTotalCompletedorders(item.pastry)
            );

            ws.cell(cellStart, 5).string(
              helpers.getTotalPendingorders(item.pastry)
            );

            ws.cell(cellStart, 6).string(helpers.getTotalAmount(item.pastry));

            ws.cell(cellStart, 7).string(item.employees.firstname);

            let itemsTxt = "N/A";

            if (item.pastry.length > 0) {
              let tempTxt = "";
              item.pastry.forEach((element) => {
                let tText = helpers.getBrnachProductName(
                  element,
                  item.pastryDetails
                );
                let _jsonFormat = {
                  name: tText,
                  date: element.delivery_date,
                  sendQty: element.sendQty,
                  price: element.sendTotal,
                };
                tempTxt += JSON.stringify(_jsonFormat);
              });
              itemsTxt = tempTxt;
            }

            ws.cell(cellStart, 8).string(itemsTxt);

            cellStart = cellStart + 1;
          });

          wb.write("documents/BranchOrderReport.xlsx", function (err, stats) {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.json({
                filename: "BranchOrderReport.xlsx",
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

  getOneBill: (req, res, next) => {
    var sQuery = { bill_no: req.params.bill };
    var addQuery = {};
    var productQ = {};
    var catQ = {};

    if (req.query.category && req.query.category.length > 0) {
      const catArr = [];

      req.query.category.forEach((item) => {
        catArr.push(new Mongoose.Types.ObjectId(item));
      });
      catQ = {
        "pastryDetails.category": { $in: catArr },
      };
      // sQuery.category = { $in: catArr };
      // sQuery.category = new Mongoose.Types.ObjectId(req.query.category);
    }

    if (req.query.currBillStatus) {
      addQuery = { "pastry.status": req.query.currBillStatus };
    }

    if (req.query.filterProducts && req.query.filterProducts.length > 0) {
      const productArr = [];

      req.query.filterProducts.forEach((item) => {
        productArr.push(new Mongoose.Types.ObjectId(item));
      });
      productQ = {
        "pastry._id": { $in: productArr },
      };
    }

    if (req.query.deliveryDate) {
      var sortOrder = req.query.deliveryDate;
      let startDate = new Date(sortOrder);
      startDate = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(startDate).setHours(23, 59, 59, 999);
      sQuery.delivery_date = { $gte: new Date(startDate), $lt: new Date(end) };
    }

    if (req.query.deliveryDateTo) {
      var sortOrder = req.query.deliveryDateTo;
      var stopDate = new Date(sortOrder).setHours(23, 59, 59, 999);
      sQuery.delivery_date = { $lte: new Date(stopDate) };
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

    if (req.query.deliveryDate && req.query.deliveryDateTo) {
      var sortOrder = req.query.deliveryDate;
      var sortOrder2 = req.query.deliveryDateTo;
      var firstDate = new Date(sortOrder).setHours(0, 0, 0, 0);
      var stopDate = new Date(sortOrder2).setHours(23, 59, 59, 999);
      sQuery.delivery_date = {
        $gte: new Date(firstDate),
        $lte: new Date(stopDate),
      };
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
      { $match: productQ },
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
        $match: catQ
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
        $lookup: {
          from: "productcategories",
          localField: "pastryDetails.category",
          foreignField: "_id",
          as: "pastryDetails.categoryData",
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
          pastries: {
            $addToSet: {
              data: "$pastry",
              orderId: { id: "$_id", date: "$created_at" },
            },
          },
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
          pastry: 1,
          pastries: 1,
        },
      },
    ];

    StockOrder.aggregate(cond).exec((err, items) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        if (items[0] && items[0]._id) {
          StockOrderPayment.findOne(
            { bill_no: items[0]._id },
            (error, payment) => {
              if (err) {
                res.status(400).json({
                  message: error.message,
                });
              } else {
                res.status(200).json({
                  message: messages.getAllMsg,
                  data: items,
                  payment: payment,
                });
              }
            }
          );
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: items,
          });
        }
      }
    });
  },
  updateBalancePayment: (req, res, next) => {
    try {
      const billno = req.params.bill;
      var bodyData = req.body;

      StockOrderPayment.findOne({ bill_no: billno }, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else if (result) {
          const totalPayment = result.balance;
          const payment = bodyData.amount;
          const balance = parseFloat(totalPayment) - parseFloat(payment);
          let status = "1";
          if (bodyData.status === "2") {
            status = "2";
          }
          if (balance < 0) {
            res.status(400).json({
              message:
                "Amount exceed. your payable amount is " + result.balance,
            });
          } else {
            StockOrderPayment.updateOne(
              { bill_no: billno },
              {
                $set: { balance: balance, status: status },
                $push: { invoiceBreakUp: { paid: bodyData.amount } },
              },
              { upsert: true },
              (error, result) => {
                if (error) {
                  res.status(400).json({
                    message: error.message,
                  });
                } else {
                  res.status(200).json({
                    message: messages.updateMsg("Balance"),
                  });
                }
              }
            );
          }
        } else {
          res.status(404).json({
            message: "No bill found",
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  updateQty: (req, res, next) => {
    try {
      var bodyData = req.body;
      // order total
      StockOrder.findById(bodyData.orderId, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else if (result) {
          let tempPastry = result.pastry;
          let totalPrice = 0;

          tempPastry.forEach((element) => {
            if (element._id == bodyData.pastry) {
              element.sendQty = bodyData.sendQty;
              element.sendTotal = bodyData.sendQty * element.price;
              if (bodyData.update) {
                element.status = "1";
              } else {
                element.status = "2";
              }
              element.updated_at = new Date();
            }
            const onePrice = element.price * element.sendQty;
            totalPrice = totalPrice + parseFloat(onePrice);
          });

          StockOrder.updateOne(
            { _id: bodyData.orderId },
            { $set: { sendTotal: totalPrice, pastry: tempPastry } },
            (error, modified) => {
              if (err) {
                res.status(400).json({
                  message: error.message,
                });
              } else {
                res.status(200).json({
                  message: messages.updateMsg("Order status"),
                });
              }
            }
          );
        } else {
          res.status(404).json({
            message: "Not found",
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

module.exports = stockOrdersCall;
