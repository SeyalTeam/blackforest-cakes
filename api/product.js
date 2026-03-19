var Product = require("../models/ProductModel");
var messages = require("../utils/messages");
var Album = require("../models/AlbumModel");
var Addons = require("../models/AddonsModel");
var Pastries = require("../models/PastryProduct");
var Mongoose = require("mongoose");
var _units = require("../models/ProductUnits");

var productCalls = {
  getAllProducts: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 20;
      var skip = currentPage * limit;

      var album = req.query && req.query.album ? req.query.album : "";
      var name = req.query && req.query.name ? req.query.name : "";

      var cond = [];
      var sQuery = {};

      const groupBy = {
        $group: {
          _id: "$_id",
          price: {
            $addToSet: "$price",
          },
          name: {
            $first: "$name",
          },
          description: {
            $first: "$description",
          },
          directuse: {
            $first: "$directuse",
          },
          image: {
            $first: "$image",
          },
          directuse: {
            $first: "$directuse",
          },
          footnote: {
            $first: "$footnote",
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
      };

      if (name) {
        sQuery = { name: { $regex: name, $options: "i" } };
      }

      if (album) {
        sQuery.album = new Mongoose.Types.ObjectId(album);
      }

      sQuery.isActive = true;

      cond = [
        {
          $match: sQuery,
        },
        { $sort: { name: 1 } },
        { $skip: skip },
        { $limit: limit },
      ];

      if (req.query.maxPrice || req.query.minPrice || req.query.unit || req.query.weightLow || req.query.weightHigh) {
        cond.unshift(groupBy);
      }

      if (req.query.unit) {
        cond.unshift({
          $match: {
            'price.unit': req.query.unit 
          },
        });
      }

      if (req.query.weightLow && req.query.weightHigh) { // range filter both values come
        cond.unshift({
          $match: {
            $expr: {
              $lte: [
                {
                  $toDecimal: "$price.qty",
                },
                parseInt(req.query.weightHigh),
              ],
            },
          },
        });
        cond.unshift({
          $match: {
            $expr: {
              $gte: [
                {
                  $toDecimal: "$price.qty",
                },
                parseInt(req.query.weightLow),
              ],
            },
          },
        });
      } 

      if (req.query.maxPrice && req.query.minPrice) {
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
        cond.unshift({
          $match: {
            $expr: {
              $gte: [
                {
                  $toDecimal: "$price.price",
                },
                parseInt(req.query.minPrice),
              ],
            },
          },
        });
      } else if (req.query.maxPrice) {
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
      } else if (req.query.minPrice) {
        cond.unshift({
          $match: {
            $expr: {
              $gte: [
                {
                  $toDecimal: "$price.price",
                },
                parseInt(req.query.minPrice),
              ],
            },
          },
        });
      }
      
      if (req.query.maxPrice || req.query.minPrice || req.query.unit || req.query.weightLow || req.query.weightHigh) {
        cond.unshift({
          $unwind: "$price",
        });
      }
      
      Product.aggregate(cond).exec((err, items) => {
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
    } catch (exp) {
      console.log(exp)
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllPastryProducts: (req, res, next) => {
    try {
      var category = req.params.category;
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 10;
      var skip = currentPage * limit;

      var name = req.query && req.query.name ? req.query.name : "";

      var cond = [];
      var sQuery = {
        category: new Mongoose.Types.ObjectId(category),
        isActive: true,
      };

      if (name) {
        sQuery = {
          name: { $regex: name, $options: "i" },
          category: new Mongoose.Types.ObjectId(category),
          isActive: true,
        };
      }

      cond = [
        {
          $match: sQuery,
        },
        // { $skip: skip },
        // { $limit: limit },
        { $sort: { created_at: -1 } },
      ];

      Pastries.aggregate(cond).exec((err, items) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getOnePastry: (req, res, next) => {
    try {
      var pId = req.params.id;
      Pastries.findById(pId).exec((err, data) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllRelatedPastries: (req, res, next) => {
    try {
      var pId = req.params.id;

      Pastries.find({ _id: { $ne: pId }, isActive: true })
        .limit(6)
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllProductsByCategory: (req, res, next) => {
    try {
      var cId = req.params.id;
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 20;
      var skip = currentPage * limit;
      var album = req.query && req.query.album ? req.query.album : "";
      var name = req.query && req.query.name ? req.query.name : "";

      var cond = [];
      var sQuery = { category: new Mongoose.Types.ObjectId(cId) };
      const groupBy = {
        $group: {
          _id: "$_id",
          price: {
            $addToSet: "$price",
          },
          name: {
            $first: "$name",
          },
          description: {
            $first: "$description",
          },
          directuse: {
            $first: "$directuse",
          },
          image: {
            $first: "$image",
          },
          directuse: {
            $first: "$directuse",
          },
          footnote: {
            $first: "$footnote",
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
      };
      
      if (name) {
        sQuery = { name: { $regex: name, $options: "i" } };
      }

      if (album) {
        sQuery.album = new Mongoose.Types.ObjectId(album);
      }
      sQuery.isActive = true;

      cond = [
        {
          $match: sQuery,
        },
        { $sort: { name: 1 } },
        { $skip: skip },
        { $limit: limit },
        // { $sort: { name: 1 } },
      ];


      if (req.query.maxPrice || req.query.minPrice || req.query.unit) {
        cond.unshift(groupBy);
      }

      if (req.query.unit) {
        cond.unshift({
          $match: {
            'price.unit': req.query.unit 
          },
        });
      }

      if (req.query.maxPrice && req.query.minPrice) {
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
        cond.unshift({
          $match: {
            $expr: {
              $gte: [
                {
                  $toDecimal: "$price.price",
                },
                parseInt(req.query.minPrice),
              ],
            },
          },
        });
      } else if (req.query.maxPrice) {
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
      } else if (req.query.minPrice) {
        cond.unshift({
          $match: {
            $expr: {
              $gte: [
                {
                  $toDecimal: "$price.price",
                },
                parseInt(req.query.minPrice),
              ],
            },
          },
        });
      }

      if (req.query.maxPrice || req.query.minPrice || req.query.unit) {
        cond.unshift({
          $unwind: "$price",
        });
      }

      Product.aggregate(cond).exec((err, items) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getProductById: (req, res, next) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllAlbums: (req, res, next) => {
    try {
      var cond = [
        {
          $match: { isActive: true },
        },
        { $sort: { name: 1 } },
      ];

      Album.aggregate(cond).exec((err, items) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllUnits: (req, res, next) => {
    try {
      var cond = [{ $sort: { name: 1 } }];

      _units.aggregate(cond).exec((err, items) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllAddons: (req, res, next) => {
    try {
      var cond = [{ $sort: { name: 1 } }];

      Addons.aggregate(cond).exec((err, items) => {
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
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
};

module.exports = productCalls;
