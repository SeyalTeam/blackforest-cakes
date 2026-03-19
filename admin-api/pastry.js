// packages
var { validationResult } = require("express-validator");
const fs = require("fs-extra");
var Mongoose = require('mongoose');

//files
var messages = require("../utils/messages");
var helpers = require("../utils/helpers");
var AWS = require("../config/aws");

//models
var Pastry = require("../models/PastryProduct");

var pastryCalls = {
  getAllProductsByCategories: (req, res, next) => {
    try {
      var categories =
        req.query && req.query.categories ? req.query.categories : [];

      Pastry.find(
        { category: { $in: categories } },
        "name",
        (error, products) => {
          if (error) {
            res.status(400).json({
              message: error.message,
            });
          } else {
            res.status(200).json({
              message: messages.getAllMsg,
              data: products,
            });
          }
        }
      );
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  create: (req, res, next) => {
    try {
      var file = req.file;
      var iData = req.body;

      var errors = validationResult(req);

      var saveData = {
        name: iData.name,
        price: iData.price,
        category: iData.category,
      };

      if (iData.unit) {
        saveData.unit = iData.unit;
      }

      if (iData.code) {
        saveData.code = iData.code;
      }

      if (iData.cgst) {
        saveData.cgst = iData.cgst;
      }

      if (iData.sgst) {
        saveData.sgst = iData.sgst;
      }

      if (iData.cess) {
        saveData.cess = iData.cess;
      }

      saveData.allowGST = iData.allowGST;

      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array(),
        });
      } else {
        if (file) {
          var pastry = new Pastry(saveData);

          pastry["image"] = file.filename;
          pastry.save((err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(201).json({
                message: messages.saveMsg("addons"),
              });
            }
          });
          // var s3 = new AWS.S3();
          // var s3Pathname = 'addons/';
          // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
          // var params = {
          //   Bucket: 'blackforestbasket',
          //   Key: s3Pathname + s3FileName,
          //   Body: file.buffer,
          // };

          // var addons = new Addons(saveData);

          // s3.upload(params, function(err, data) {
          //   if (err) {
          //       throw err;
          //   }
          //   addons['image'] = s3FileName;
          //   addons.save((err, result) => {
          //     if(err){
          //         res.status(400).json({
          //             message: err.message
          //         });
          //     } else{
          //         res.status(201).json({
          //             message: messages.saveMsg('addons')
          //         });
          //     }
          //   })
          // });
        } else {
          var pastry = new Pastry(saveData);
          pastry.save((err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(201).json({
                message: messages.saveMsg("pastry"),
              });
            }
          });
        }
      }
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  update: (req, res, next) => {
    try {
      var pastryId = req.params.id;
      var incData = req.body;
      var file = req.file;

      Pastry.findById(pastryId, (err, pastryData) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        }

        if (pastryData) {
          var updateData = {
            name: incData.name,
            price: incData.price,
            category: incData.category,
          };
          if (incData.unit) {
            updateData.unit = incData.unit;
          }

          if (incData.code) {
            updateData.code = incData.code;
          }

          if (incData.cgst) {
            updateData.cgst = incData.cgst;
          }

          if (incData.sgst) {
            updateData.sgst = incData.sgst;
          }

          if (incData.cess) {
            updateData.cess = incData.cess;
          }

          updateData.allowGST = incData.allowGST;
          updateData.isActive = incData.isActive;


          if (file) {
            // var s3 = new AWS.S3();
            if (pastryData.image) {
              const path = "./uploads/" + pastryData.image;
              fs.remove(path, (err) => {
                if (err) return console.log(err);
              });
              updateData.image = file.filename;
              pastryCalls.processUpdate(req, res, pastryId, updateData);

              // var s3Pathname = 'addons/';

              // var params = {
              //   Bucket: 'blackforestbasket',
              //   Key: s3Pathname + addonData.image
              // };

              // s3.deleteObject(params, function (err, data) {
              //   if (data) {
              //       var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
              //       var params = {
              //         Bucket: 'blackforestbasket',
              //         Key: s3Pathname + s3FileName,
              //         Body: file.buffer,
              //       };

              //       s3.upload(params, function(err, data) {
              //         if (err) {
              //             throw err;
              //         }
              //         updateData.image = s3FileName;
              //         addonsCalls.processUpdate(req,res,addonId,updateData);
              //       });
              //   }
              //   else {
              //     res.status(500).json({
              //       message: err.message
              //     });
              //   }
              // });
            } else {
              updateData.image = file.filename;
              pastryCalls.processUpdate(req, res, pastryId, updateData);

              // var s3Pathname = 'addons/';
              // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
              // var params = {
              //   Bucket: 'blackforestbasket',
              //   Key: s3Pathname + s3FileName,
              //   Body: file.buffer,
              // };

              // s3.upload(params, function(err, data) {
              //   if (err) {
              //       throw err;
              //   }
              //   updateData.image = s3FileName;
              //   addonsCalls.processUpdate(req,res,addonId,updateData);
              // });
            }
          } else {
            pastryCalls.processUpdate(req, res, pastryId, updateData);
          }
        } else {
          res.status(404).json({
            message: messages.noDataMsg,
          });
        }
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  processUpdate: (req, res, id, updateData) => {

    Pastry.updateOne({ _id: id }, updateData, (err, result) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        res.status(200).json({
          message: messages.updateMsg("Pastry"),
        });
      }
    });
  },

  getAll: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 15;
      var skip = currentPage * limit;
      var name = req.query && req.query.name ? req.query.name : "";
      var sQuery = {
        name: { $regex: name, $options: "i" },
      };

      let cond = [
        {
          $facet: {
            paginatedResults: [{ $skip: skip }, { $limit: limit }],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ];

      if (req.query.maxPrice) {
        cond.unshift({
          $match: {
            $expr: {
              $lte: [
                {
                  $toDecimal: "$price",
                },
                parseInt(req.query.maxPrice),
              ],
            },
          },
        })
      }

      if (req.query.unitSearch) {
        cond.unshift({
          $match: {
            "unit": new Mongoose.Types.ObjectId(req.query.unitSearch),
          },
        });
      }

      if (req.query.name) {
        cond.unshift({
          $match: sQuery
        });
      } 

      Pastry.aggregate(cond).exec((err, stores) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: stores,
          });
        }
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getOne: (req, res, next) => {
    try {
      var pastryId = req.params.id;

      Pastry.findById(pastryId, (err, data) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.getOneMsg,
            data: data,
          });
        }
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  deletePastryById: (req, res, next) => {
    try {
      var pastryId = req.params.id;
      Pastry.findById(pastryId, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          if (result && result.image) {
            const path = "./uploads/" + result.image;
            fs.remove(path, (err) => {
              if (err) return console.log(err);
            });
            Pastry.deleteOne({ _id: pastryId }, (err, d) => {
              if (err) {
                res.status(400).json({
                  message: err.message,
                });
              } else {
                res.status(200).json({
                  message: messages.deleteMsg("Pastry"),
                });
              }
            });

            // var s3 = new AWS.S3();
            // var s3Pathname = 'addons/';

            // var params = {
            //   Bucket: 'blackforestbasket',
            //   Key: s3Pathname + result.image
            // };

            // s3.deleteObject(params, function (err, data) {
            //   if (data) {
            //     Addons.deleteOne({_id: addonsId}, (err, d) => {
            //       if(err){
            //         res.status(400).json({
            //           message: err.message
            //         });
            //       }

            //       res.status(200).json({
            //         message: messages.deleteMsg('addons')
            //       });
            //     })
            //   } else {
            //     res.status(500).json({
            //       message: err.message
            //     });
            //   }
            // });
          } else {
            Pastry.deleteOne({ _id: pastryId }, (err, d) => {
              if (err) {
                res.status(400).json({
                  message: err.message,
                });
              } else {
                res.status(200).json({
                  message: messages.deleteMsg("Pastry"),
                });
              }
            });
          }
        }
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
};

module.exports = pastryCalls;
