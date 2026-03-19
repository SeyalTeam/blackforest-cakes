// packages
var { validationResult } = require("express-validator");

//files
var messages = require("../utils/messages");
// var pusher = require('../config/notify');
//models
var Album = require("../models/AlbumModel");
var Product = require("../models/ProductModel");

var albumCalls = {
  create: (req, res, next) => {
    try {
      var iData = req.body;
      var errors = validationResult(req);

      var saveData = {
        name: iData.name,
        isActive: iData.isActive,
      };
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array(),
        });
      } else {
        var album = new Album(saveData);
        album.save((err, result) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(201).json({
              message: messages.saveMsg("album"),
            });
          }
        });
      }
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  update: (req, res, next) => {
    try {
      var addonId = req.params.id;
      var incData = req.body;

      Album.findById(addonId, (err, addonData) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        }

        if (addonData) {
          var updateData = {
            name: incData.name,
            isActive: incData.isActive,
          };
          albumCalls.processUpdate(req, res, addonId, updateData);
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
    Album.updateOne({ _id: id }, updateData, (err, result) => {
      if (err) {
        res.status(400).json({
          message: err.message,
        });
      } else {
        res.status(200).json({
          message: messages.updateMsg("album"),
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
      var cond = [
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

      var name = req.query && req.query.name ? req.query.name : "";

      if (name) {
        var sQuery = {
          name: { $regex: name, $options: "i" },
        };

        cond = [
          {
            $match: sQuery,
          },
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
      }

      Album.aggregate(cond).exec((err, stores) => {
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
      var addonId = req.params.id;

      Album.findById(addonId, (err, data) => {
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

  deleteAlbumById: (req, res, next) => {
    try {
      var cId = req.params.id;
      Product.countDocuments({ album: cId }, (err, count) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        }

        if (count) {
          res.status(400).json({
            message:
              "Could not delete this album. Still some products belongs to this album!",
          });
        } else {
          Album.findById(cId, (err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              Album.deleteOne({ _id: cId }, (err, d) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                }

                res.status(200).json({
                  message: messages.deleteMsg("Album"),
                });
              });
            }
          });
        }
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
};

module.exports = albumCalls;
