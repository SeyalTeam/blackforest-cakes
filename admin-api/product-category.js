// packages
var { validationResult } = require('express-validator');
const fs = require('fs-extra');

//files
var messages = require('../utils/messages');
var helpers = require('../utils/helpers');
var AWS = require('../config/aws');

//models
var ProductCategory = require('../models/ProductCategoryModel');
var Products = require('../models/ProductModel');

var productCategoryCalls = {
  create: (req, res, next) => {
    try {
      var file = req.file;
      var iData = req.body;
      var errors = validationResult(req);

      var saveData = {
        name: iData.name,
        parentId: (iData.parentId) ? iData.parentId : null,
        isPastryProduct: iData.isPastryProduct ? iData.isPastryProduct : false
      }

      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array()
        });
      }

      if (file) {
        var productCategory = new ProductCategory(saveData);

        productCategory['image'] = file.filename;
        productCategory.save((err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message
            });
          } else {
            res.status(201).json({
              message: messages.saveMsg('product category')
            });
          }
        })
        // var s3 = new AWS.S3();
        // var s3Pathname = 'product-category/';
        // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);

        // var params = {
        //   Bucket: 'blackforestbasket',
        //   Key: s3Pathname + s3FileName,
        //   Body: file.buffer,
        // }; 
        // var productCategory = new ProductCategory(saveData);


        // s3.upload(params, function(err, data) {
        //   if (err) {
        //       throw err;
        //   }
        //   productCategory['image'] = s3FileName;
        //   productCategory.save((err, result) => {
        //     if(err){
        //         res.status(400).json({
        //             message: err.message
        //         });
        //     } else{
        //         res.status(201).json({
        //             message: messages.saveMsg('product category')
        //         });             
        //     }
        //   })
        // });
      } else {
        var productCategory = new ProductCategory(saveData);
        productCategory.save((err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message
            });
          } else {
            res.status(201).json({
              message: messages.saveMsg('product category')
            });
          }
        })
      }

    } catch (exception) {
      console.log(exception)
      res.status(500).json({
        message: messages.exceptionMsg
      });
    }
  },

  getAllPastryCategoryList: (req, res, next) => {
    try {
      ProductCategory.find({ isPastryProduct: true }, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else {
          res.status(200).json({
            data: result
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

  update: (req, res, next) => {
    try {
      var categoryId = req.params.id;
      var incData = req.body;
      var file = req.file;

      ProductCategory.findById(categoryId, (err, categoryData) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }

        if (categoryData) {
          var updateData = {
            name: incData.name,
            parentId: (incData.parentId) ? incData.parentId : null,
            isPastryProduct: incData.isPastryProduct ? incData.isPastryProduct : false
          };

          if (file) {
            var s3 = new AWS.S3();
            if (categoryData.image) {
              const path = './uploads/' + categoryData.image;
              fs.remove(path, (err) => {
                if (err) return console.log(err);

              })

              updateData.image = file.filename;;
              productCategoryCalls.processUpdate(req, res, categoryId, updateData);

              // var s3Pathname = 'product-category/';

              // var params = {
              //   Bucket: 'blackforestbasket',
              //   Key: s3Pathname + categoryData.image
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
              //         productCategoryCalls.processUpdate(req,res,categoryId,updateData);
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
              productCategoryCalls.processUpdate(req, res, categoryId, updateData);
              // var s3Pathname = 'product-category/';
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
              //   updateData.image = file.filename;;
              //   productCategoryCalls.processUpdate(req,res,categoryId,updateData);
              // });
            }

          } else {
            productCategoryCalls.processUpdate(req, res, categoryId, updateData);
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

  processUpdate: (req, res, cId, updateData) => {
    ProductCategory.updateOne({ _id: cId }, updateData, (err, result) => {
      if (err) {
        res.status(400).json({
          message: err.message
        });
      } else {
        res.status(200).json({
          message: messages.updateMsg('product category')
        });
      }
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

      ProductCategory.aggregate(cond).exec((err, stores) => {
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
      var catId = req.params.id;

      ProductCategory.findById(catId, (err, data) => {
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

  deleteCateById: (req, res, next) => {
    try {
      var cId = req.params.id;
      Products.countDocuments({ category: cId }, (err, count) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }

        if (count) {
          res.status(400).json({
            message: 'Could not delete this category. Still some products belongs to this store!'
          });
        } else {
          ProductCategory.findById(cId, (err, result) => {
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

              ProductCategory.deleteOne({ _id: cId }, (err, d) => {
                if (err) {
                  res.status(400).json({
                    message: err.message
                  });
                }

                res.status(200).json({
                  message: messages.deleteMsg('Product Category')
                });
              })

            } else {
              ProductCategory.deleteOne({ _id: cId }, (err, d) => {
                if (err) {
                  res.status(400).json({
                    message: err.message
                  });
                }

                res.status(200).json({
                  message: messages.deleteMsg('Product Category')
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

module.exports = productCategoryCalls;