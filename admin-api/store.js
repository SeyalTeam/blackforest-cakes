// packages
var { validationResult } = require('express-validator');
//files
var messages = require('../utils/messages');
// var AWS = require('../config/aws');
const fs = require('fs-extra');

//models
var Store = require('../models/StoreModel');
var Employee = require('../models/EmployeeModel');

var storeCalls = {
  createStore: (req, res, next) => {
    try {
      var file = req.file;
      var iData = req.body;
      var errors = validationResult(req);

      var saveData = {
        branch: iData.branch,
        address: iData.address,
        phone: iData.phone
      }

      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array()
        });
      } else {

        if (file) {
          // var s3 = new AWS.S3();
          // var s3Pathname = 'store/';
          // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
          // var params = {
          //   Bucket: 'blackforestbasket',
          //   Key: s3Pathname + s3FileName,
          //   Body: file.buffer,
          // }; 
          var createStore = new Store(saveData);
          createStore.image = file.filename;

          createStore.save((err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            } else {
              res.status(201).json({
                message: messages.saveMsg('store')
              });
            }
          })
          // s3.upload(params, function(err, data) {
          //   if (err) {
          //       throw err;
          //   }
          //   saveData.image = s3FileName;
          //   var createStore = new Store(saveData);
          //   createStore.save((err, result) => {
          //     if(err){
          //         res.status(400).json({
          //             message: err.message
          //         });
          //     } else{
          //         res.status(201).json({
          //             message: messages.saveMsg('store')
          //         });             
          //     }
          //   })
          // });
        } else {
          var createStore = new Store(saveData);
          createStore.save((err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            } else {
              res.status(201).json({
                message: messages.saveMsg('store')
              });
            }
          })
        }
      }

    } catch (exception) {
      console.log(exception)
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },

  getAll: (req, res, next) => {
    try {
      var currentPage = (req.query && req.query.page) ? parseInt(req.query.page) : 0;
      var limit = 15;
      var skip = currentPage * limit;
      var cond = [
        {
          "$lookup": {
            "from": "employees",
            "localField": "_id",
            "foreignField": "branch",
            "as": "employees"
          }
        },
        {
          "$project": {
            "_id": 1,
            "branch": 1,
            "phone": 1,
            "records": 1,
            "empl": { $cond: { if: { $isArray: "$employees" }, then: { $size: "$employees" }, else: "NA" } },
          }
        },
        {
          $facet: {
            paginatedResults: [{ $skip: skip }, { $limit: limit }],
            totalCount: [
              {
                $count: 'count',
              }
            ]
          }
        },
      ];

      var branchName = (req.query && req.query.branch) ? req.query.branch : '';
      if (branchName) {
        var sQuery = {
          branch: { $regex: branchName, $options: 'i' }
        };

        cond = [
          {
            $match: sQuery
          },
          {
            "$lookup": {
              "from": "employees",
              "localField": "_id",
              "foreignField": "branch",
              "as": "employees"
            }
          },
          {
            "$project": {
              "_id": 1,
              "branch": 1,
              "records": 1,
              "phone": 1,
              "empl": { $cond: { if: { $isArray: "$employees" }, then: { $size: "$employees" }, else: "NA" } },
            }
          },
          {
            $facet: {
              paginatedResults: [{ $skip: skip }, { $limit: limit }],
              totalCount: [
                {
                  $count: 'count',
                }
              ]
            }
          },
        ];
      }

      Store.aggregate(cond).exec((err, stores) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: stores
          });
        }
      })
    } catch (exception) {
      console.log(exception)
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },

  getOneStore: (req, res, next) => {
    try {
      var storeId = req.params.id;

      Store.findById(storeId, (err, data) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }
        res.status(200).json({
          message: messages.getOneMsg,
          data: data
        });
      })
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },

  updateStore: (req, res, next) => {
    try {
      var storeId = req.params.id;
      var incData = req.body;
      var file = req.file;

      Store.findById(storeId, (err, storeData) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }

        if (storeData) {
          var updateData = {
            branch: incData.branch,
            address: incData.address,
            phone: incData.phone
          };

          if (file) {
            // var s3 = new AWS.S3();
            if (storeData.image) {
              // var s3Pathname = 'store/';

              // var params = {
              //   Bucket: 'blackforestbasket',
              //   Key: s3Pathname + storeData.image
              // };
              // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
              updateData.image = file.filename;
              const path = './uploads/' + storeData.image;
              fs.remove(path, (err) => {
                if (err) return console.log(err);

              })

              storeCalls.processUpdate(req, res, storeId, updateData);

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
              //         storeCalls.processUpdate(req,res,storeId,updateData);
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
              storeCalls.processUpdate(req, res, storeId, updateData);
            }

          } else {
            storeCalls.processUpdate(req, res, storeId, updateData);
          }

        } else {
          res.status(404).json({
            message: messages.noDataMsg
          });
        }

      })
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },

  processUpdate: (req, res, storeId, updateData) => {
    Store.updateOne({ _id: storeId }, updateData, (err, result) => {
      if (err) {
        res.status(400).json({
          message: err.message
        });
      }

      res.status(200).json({
        message: messages.updateMsg('store')
      });
    })
  },

  deleteStoreById: (req, res, next) => {
    try {
      var storeId = req.params.id;
      Employee.countDocuments({ branch: storeId }, (err, count) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }

        if (count) {
          res.status(400).json({
            message: 'Could not delete this store. Still some employees belongs to this store!'
          });
        } else {
          Store.findById(storeId, (err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            }

            if (result && result.image) {
              // var s3 = new AWS.S3();
              // var s3Pathname = 'store/';

              // var params = {
              //   Bucket: 'blackforestbasket',
              //   Key: s3Pathname + result.image
              // };

              const path = './uploads/' + result.image;
              fs.remove(path, (err) => {
                if (err) return console.log(err);

              });

              Store.deleteOne({ _id: storeId }, (err, d) => {
                if (err) {
                  res.status(400).json({
                    message: err.message
                  });
                }

                res.status(200).json({
                  message: messages.deleteMsg('store')
                });
              })

              // s3.deleteObject(params, function (err, data) {
              //   if (data) {
              //     Store.deleteOne({_id: storeId}, (err, d) => {
              //       if(err){
              //         res.status(400).json({
              //           message: err.message
              //         });
              //       }

              //       res.status(200).json({
              //         message: messages.deleteMsg('store')
              //       });
              //     })
              //   } else {
              //     res.status(500).json({
              //       message: err.message
              //     });
              //   }
              // });
            } else {
              Store.deleteOne({ _id: storeId }, (err, d) => {
                if (err) {
                  res.status(400).json({
                    message: err.message
                  });
                }

                res.status(200).json({
                  message: messages.deleteMsg('store')
                });
              })
            }
          });
        }
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  }
};

module.exports = storeCalls;