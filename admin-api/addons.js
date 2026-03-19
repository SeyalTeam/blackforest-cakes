// packages
var { validationResult } = require('express-validator');
const fs = require('fs-extra');

//files
var messages = require('../utils/messages');
var helpers = require('../utils/helpers');
var AWS = require('../config/aws');

//models
var Addons = require('../models/AddonsModel');

var addonsCalls = {
  create: (req, res, next) => {
    try {
      var file = req.file;
      var iData = req.body;
      var errors = validationResult(req);

      var saveData = {
        name: iData.name,
        price: iData.price
      }

      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array()
        });
      }

      if (file) {
        var addons = new Addons(saveData);

        addons['image'] = file.filename;
        addons.save((err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message
            });
          } else {
            res.status(201).json({
              message: messages.saveMsg('addons')
            });
          }
        })
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
        var addons = new Addons(saveData);
        addons.save((err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message
            });
          } else {
            res.status(201).json({
              message: messages.saveMsg('addons')
            });
          }
        })
      }

    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },

  update: (req, res, next) => {
    try {
      var addonId = req.params.id;
      var incData = req.body;
      var file = req.file;

      Addons.findById(addonId, (err, addonData) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }

        if (addonData) {
          var updateData = {
            name: incData.name,
            price: incData.price
          };

          if (file) {
            var s3 = new AWS.S3();
            if (addonData.image) {
              const path = './uploads/' + addonData.image;
              fs.remove(path, (err) => {
                if (err) return console.log(err);

              })
              updateData.image = file.filename;;
              addonsCalls.processUpdate(req, res, addonId, updateData);

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
              updateData.image = file.filename;;
              addonsCalls.processUpdate(req, res, addonId, updateData);

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
            addonsCalls.processUpdate(req, res, addonId, updateData);
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

  processUpdate: (req, res, id, updateData) => {
    Addons.updateOne({ _id: id }, updateData, (err, result) => {
      if (err) {
        res.status(400).json({
          message: err.message
        });
      }

      res.status(200).json({
        message: messages.updateMsg('addons')
      });
    })
  },

  getAll: (req, res, next) => {
    try {
      var currentPage = (req.query && req.query.page) ? parseInt(req.query.page) : 0;
      var limit = 15;
      var skip = currentPage * limit;
      var cond = [
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

      var name = (req.query && req.query.name) ? req.query.name : '';

      if (name) {
        var sQuery = {
          name: { $regex: name, $options: 'i' }
        };

        cond = [
          {
            $match: sQuery
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

      Addons.aggregate(cond).exec((err, stores) => {
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
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },

  getOne: (req, res, next) => {
    try {
      var addonId = req.params.id;

      Addons.findById(addonId, (err, data) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else {
          res.status(200).json({
            message: messages.getOneMsg,
            data: data
          });
        }
      })
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },


  deleteAddonsById: (req, res, next) => {
    try {
      var addonsId = req.params.id;
      Addons.findById(addonsId, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }

        if (result && result.image) {
          const path = './uploads/' + result.image;
          fs.remove(path, (err) => {
            if (err) return console.log(err);

          });
          Addons.deleteOne({ _id: addonsId }, (err, d) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            } else {
              res.status(200).json({
                message: messages.deleteMsg('addons')
              });
            }
          })

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
          Addons.deleteOne({ _id: addonsId }, (err, d) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            } else {
              res.status(200).json({
                message: messages.deleteMsg('addons')
              });
            }
          })
        }
      });

    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  }
};

module.exports = addonsCalls;