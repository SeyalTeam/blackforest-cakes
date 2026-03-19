// packages
var { validationResult } = require("express-validator");
var Mongoose = require("mongoose");
const fs = require("fs-extra");

//files
var messages = require("../utils/messages");
var helpers = require("../utils/helpers");
var AWS = require("../config/aws");

//models
var Product = require("../models/ProductModel");
var Album = require("../models/AlbumModel");
var ProductCategory = require("../models/ProductCategoryModel");

var productCalls = {
  getAllProductsByCategories: (req, res, next) => {
    try {
      var categories =
        req.query && req.query.categories ? req.query.categories : [];

      var params = { isActive: true };

      if (categories && categories.length > 0) {
        params = { category: { $in: categories }, isActive: true };
      }

      Product.find(params, "name", (error, products) => {
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
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getAlbumCollection: (req, res, next) => {
    try {
      Album.find({}, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: data,
          });
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getCategory: (req, res, next) => {
    try {
      let query = {
        $or: [
          { isPastryProduct: false },
          { isPastryProduct: { $exists: false } },
        ],
      };
      var cid = req.query && req.query.category ? req.query.category : "";

      if (cid) {
        query = {
          _id: { $ne: cid },
          $or: [
            { isPastryProduct: false },
            { isPastryProduct: { $exists: false } },
          ],
        };
      }

      ProductCategory.find(query, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: data,
          });
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  getCategoryPastry: (req, res, next) => {
    try {
      let query = { isPastryProduct: true };
      var cid = req.query && req.query.category ? req.query.category : "";

      if (cid) {
        query = { _id: { $ne: cid }, isPastryProduct: true };
      }

      const q = [
        { $match: query },
        {
          $lookup: {
            from: "pastries",
            localField: "_id",
            foreignField: "category",
            as: "productItems",
          },
        },
        {
          $project: {
            _id: 1,
            created_at: 1,
            image: 1,
            name: 1,
            isPastryProduct: 1,
            parentId: 1,
            products: { $size: "$productItems" },
          },
        },
      ];

      ProductCategory.aggregate(q).exec((err, data) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: data,
          });
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  create: async (req, res, next) => {
    try {
      var files = req.files;
      var iData = req.body;
      var errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array(),
        });
      } else {
        if ((iData.price && iData.price.length <= 0) || !iData.price) {
          res.status(422).json({
            message: "price is required",
            errors: errors.array(),
          });
        } else {
          var saveData = {
            name: iData.name,
            category: iData.category,
            price: iData.price,
            album: iData.album,
          };

          if (iData.description) {
            saveData.description = iData.description;
          }

          if (iData.directuse) {
            saveData.directuse = iData.directuse;
          }
          if (iData.footnote) {
            saveData.footnote = iData.footnote;
          }
          if (iData.ingredients) {
            saveData.ingredients = iData.ingredients;
          }

          if (files && files.length > 0) {
            var imgCollection = [];
            files.map((img) => {
              imgCollection.push(img.filename);
            });
            saveData.image = await Promise.all(imgCollection);

            // files.map((img) => {
            //     var s3Pathname = 'product/';
            //     var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(img.originalname);
            //     var params = {
            //         Bucket: 'blackforestbasket',
            //         Key: s3Pathname + s3FileName,
            //         Body: img.buffer,
            //     };
            //     imgCollection.push(new Promise((resolve, reject) => {
            //         s3.upload(params, function (err, data) {
            //             if (err) {
            //                 throw err;
            //             } else {
            //                 resolve(s3FileName)
            //             }
            //         });
            //     }))
            // });
            // saveData.image = await Promise.all(imgCollection);
            productCalls.processCreate(req, res, saveData);
          } else {
            productCalls.processCreate(req, res, saveData);
          }
        }
      }
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  processCreate: (req, res, saveData) => {
    var product = new Product(saveData);
    Product.countDocuments((error, c) => {
      if (error) {
        res.status(400).json({
          message: error.message,
        });
      } else {
        if (!c) c = 0;
        product.display_order = c + 1;

        product.save((err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(201).json({
              message: messages.saveMsg("product"),
              productId: result._id,
            });
          }
        });
      }
    });
  },

  getAll: (req, res, next) => {
    try {
      // var sQuery = { isActive: true };
      var sQuery = {};

      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 15;
      var skip = currentPage * limit;

      var cond = [
        {
          $match: sQuery,
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
          $lookup: {
            from: "albums",
            localField: "album",
            foreignField: "_id",
            as: "album",
          },
        },
        {
          $facet: {
            paginatedResults: [
              { $sort: { display_order: 1 } },
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

      var category = req.query && req.query.category ? req.query.category : "";
      var album = req.query && req.query.album ? req.query.album : "";
      var name = req.query && req.query.name ? req.query.name : "";

      if (name) {
        sQuery.name = { $regex: name, $options: "i" };
      }

      if (category) {
        const newId = new Mongoose.Types.ObjectId(category);
        sQuery.category = newId;
      }

      if (album) {
        const newId = new Mongoose.Types.ObjectId(album);
        sQuery.album = newId;
      }

      if (name || category || album) {
        cond = [
          {
            $match: sQuery,
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
            $lookup: {
              from: "albums",
              localField: "album",
              foreignField: "_id",
              as: "album",
            },
          },
          {
            $facet: {
              paginatedResults: [
                { $sort: { display_order: 1 } },
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
      }

      if (
        req.query.maxPrice ||
        req.query.weightChange ||
        req.query.unitSearch
      ) {
        cond.unshift({
          $group: {
            _id: "$_id",
            price: {
              $addToSet: "$price",
            },
            name: {
              $first: "$name",
            },
            productCategory: {
              $first: "$productCategory",
            },
            isActive: {
              $first: "$isActive",
            },
            album: {
              $first: "$album",
            },
            display_order: {
              $first: "$display_order",
            },
            category: {
              $first: "$category",
            },
            created_at: {
              $first: "$created_at",
            },
          },
        });

        if (req.query.maxPrice) {
          cond.unshift({
            $match: {
              $expr: {
                $lte: [
                  {
                    $toDecimal: "$price.price",
                  },
                  parseInt(req.query.maxPrice),
                ],
              },
            },
          });
        }

        if (req.query.unitSearch) {
          cond.unshift({
            $match: {
              "price.unit": req.query.unitSearch,
            },
          });
        }

        if (req.query.weightChange) {
          cond.unshift({
            $match: {
              $expr: {
                $lte: [
                  {
                    $toDecimal: "$price.qty",
                  },
                  parseInt(req.query.weightChange),
                ],
              },
            },
          });
        }

        cond.unshift({
          $unwind: "$price",
        });
      }

      Product.aggregate(cond).exec((err, products) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: products,
          });
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getOne: (req, res, next) => {
    try {
      var pId = req.params.id;

      Product.findById(pId)
        .populate("category")
        .exec((err, data) => {
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

  update: (req, res, next) => {
    try {
      var iData = req.body;
      var errors = validationResult(req);
      var productId = req.params.id;

      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array(),
        });
      } else {
        var updateData = {
          name: iData.name,
          category: iData.category,
          price: iData.price,
          album: iData.album,
        };
        updateData.description = iData.description;
        updateData.directuse = iData.directuse;
        updateData.footnote = iData.footnote;
        updateData.ingredients = iData.ingredients;

        Product.updateOne({ _id: productId }, updateData, (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          }

          res.status(200).json({
            message: messages.updateMsg("product"),
          });
        });
      }
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  addProductImage: (req, res, next) => {
    try {
      var productId = req.params.id;
      var file = req.file;

      if (file) {
        Product.updateOne(
          { _id: productId },
          { $push: { image: file.filename } },
          (err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(200).json({
                message: "Image uploaded",
              });
            }
          }
        );
        // var s3 = new AWS.S3();
        // var s3Pathname = 'product/';
        // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
        // var params = {
        //     Bucket: 'blackforestbasket',
        //     Key: s3Pathname + s3FileName,
        //     Body: file.buffer,
        // };

        // s3.upload(params, function(err, data) {
        //     if (err) {
        //         throw err;
        //     } else {
        //         Product.updateOne({_id: productId}, {$push: {image: s3FileName}}, (err, result) => {
        //         if(err){
        //           res.status(400).json({
        //             message: err.message
        //           });
        //         } else{
        //             res.status(200).json({
        //                 message: 'Image uploaded'
        //             });
        //         }

        //     })
        //     }
        // });
      } else {
        res.status(400).json({
          message: "Failed to upload!",
        });
      }
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  removeProductImage: (req, res, next) => {
    try {
      var productId = req.params.id;

      const path = "./uploads/" + req.body.name;
      fs.remove(path, (err) => {
        if (err) return console.log(err);
      });

      Product.updateOne(
        { _id: productId },
        { $pull: { image: req.body.name } },
        (err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(200).json({
              message: "Image removed",
            });
          }
        }
      );
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  activateProduct: (req, res, next) => {
    try {
      var productId = req.params.id;

      Product.updateOne(
        { _id: productId },
        { $set: { isActive: true } },
        (err, d) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(200).json({
              message: messages.deleteMsg("product"),
            });
          }
        }
      );
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  deactivateProduct: (req, res, next) => {
    try {
      var productId = req.params.id;

      Product.updateOne(
        { _id: productId },
        { $set: { isActive: false } },
        (err, d) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(200).json({
              message: messages.deleteMsg("product"),
            });
          }
        }
      );
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  /**
   * not for production only for bulk
   * update of the display order
   * ! not to be used
   */

  addDisplayOrder: (req, res, next) => {
    Product.find((err, result) => {
      var prod = result;
      prod.forEach((element, key) => {
        Product.updateOne(
          { _id: element._id },
          { display_order: key + 1 },
          (err, resl) => {
            console.log(err);
          }
        );
      });
      res.status(200).json({ data: result.length });
    });
  },
};

module.exports = productCalls;
