// packages
var { validationResult } = require('express-validator');

//files
var messages = require('../utils/messages');

//models
var ProductUnit = require('../models/ProductUnits');

var unitCalls = {
  create: (req, res, next) => {
    try {
      var iData = req.body;
      var errors = validationResult(req);

      var saveData = {
        name: iData.name,
      }
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array()
        });
      } else {
        var unit = new ProductUnit(saveData);
        unit.save((err, result) => {

          if (err) {
            res.status(400).json({
              message: err.message
            });
          } else {

            res.status(201).json({
              message: messages.saveMsg('Unit')
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

      ProductUnit.findById(addonId, (err, addonData) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        }

        if (addonData) {
          var updateData = {
            name: incData.name,
          };
          unitCalls.processUpdate(req, res, addonId, updateData);

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
    ProductUnit.updateOne({ _id: id }, updateData, (err, result) => {
      if (err) {
        res.status(400).json({
          message: err.message
        });
      } else {
        res.status(200).json({
          message: messages.updateMsg('unit')
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

      ProductUnit.aggregate(cond).exec((err, stores) => {
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

  getAllUnits: (req, res, next) => {
    try {

      ProductUnit.find({}, (err, stores) => {
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
      var unitId = req.params.id;

      ProductUnit.findById(unitId, (err, data) => {
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


  deleteAlbumById: (req, res, next) => {
    try {
      var cId = req.params.id;
      ProductUnit.findById(cId, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message
          });
        } else {
          ProductUnit.deleteOne({ _id: cId }, (err, d) => {
            if (err) {
              res.status(400).json({
                message: err.message
              });
            } else {
              res.status(200).json({
                message: messages.deleteMsg('Product unit')
              });
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

module.exports = unitCalls;