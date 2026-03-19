var ProductCategory = require('../models/ProductCategoryModel');
var messages = require('../utils/messages');

var categoryCalls = {
    getAll: (req, res, next) => {
        try{
            var cond = [
                { $match: {
                  parentId : null, 
                  $or: [
                    {isPastryProduct: false},
                    {isPastryProduct: {$exists: false }}]
                  }
                },
                {
                    "$lookup": {
                        "from": "productcategories",
                        "localField": "_id",
                        "foreignField": "parentId",
                        "as": "child"
                    }
                }
            ];

            ProductCategory.aggregate(cond).exec((err, items) => {
                if(err){
                  res.status(400).json({
                    message: err.message
                  });
                } else{
                  res.status(200).json({
                    message: messages.getAllMsg,
                    data: items
                  });
                }
              })
        } catch(exp){
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    getAllCategories: (req, res, next) => {
      try{
          var cond = [
            { $match: {
                parentId : null, 
                isPastryProduct: true
              }
            },
              {
                  "$lookup": {
                      "from": "productcategories",
                      "localField": "_id",
                      "foreignField": "parentId",
                      "as": "child"
                  }
              }
          ];

          ProductCategory.aggregate(cond).exec((err, items) => {
              if(err){
                res.status(400).json({
                  message: err.message
                });
              } else{
                res.status(200).json({
                  message: messages.getAllMsg,
                  data: items
                });
              }
            })
      } catch(exp){
          res.status(500).json({
              message: messages.exceptionMsg
          });
      }
  }
};

module.exports = categoryCalls;