var Mongoose = require("mongoose");
var messages = require('../utils/messages');
//models
var BranchCategory = require('../models/BranchStocksCategory');
var BranchProduct = require('../models/BranchStocksProduct');

var branchStocksCalls = {
    getAllEnabledCategory: (req, res) => {
        try {
            var branch = (req.query && req.query.branch) ? new Mongoose.Types.ObjectId(req.query.branch) : '';
            var cond = [
                { $match: { branch: branch, isEnable: true } },
                {
                    "$lookup": {
                        "from": "productcategories",
                        localField: "category",
                        foreignField: "_id",
                        "as": "categoryDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$categoryDetails",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $group: {
                        _id: "$category",
                        created_at: { $first: "$categoryDetails.created_at" },
                        image: { $first: "$categoryDetails.image" },
                        isPastryProduct: { $first: "$categoryDetails.isPastryProduct" },
                        name: { $first: "$categoryDetails.name" },
                        parentId: { $first: "$categoryDetails.parentId" },
                    },
                },
                { $sort: { name: 1 } }
            ];

            BranchCategory.aggregate(cond)
                .exec((err, items) => {
                    if (err) {
                        console.log(err);
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
        } catch (exception) {

            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },

    getAllEnabledProducts: (req, res) => {
        try {
            var category = (req.query && req.query.category) ? new Mongoose.Types.ObjectId(req.query.category) : '';
            var branch = (req.query && req.query.branch) ? new Mongoose.Types.ObjectId(req.query.branch) : '';
            const search = req.query.name ? req.query.name : '';
            const matchQuery =  { branch: branch, isEnable: true, category: category };


            const cond = [
                { $match: matchQuery },
                {
                    "$lookup": {
                        "from": "pastries",
                        localField: "product",
                        foreignField: "_id",
                        "as": "productDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$productDetails",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $group: {
                        _id: "$product",
                        allowGST: { $first: "$productDetails.allowGST" },
                        category: { $first: "$productDetails.category" },
                        cess: { $first: "$productDetails.cess" },
                        cgst: { $first: "$productDetails.cgst" },
                        code: { $first: "$productDetails.code" },
                        created_at: { $first: "$productDetails.created_at" },
                        inStock: { $first: "$productDetails.inStock" },
                        isActive: { $first: "$productDetails.isActive" },
                        name: { $first: "$productDetails.name" },
                        price: { $first: "$productDetails.price" },
                        qty: { $first: "$productDetails.qty" },
                        sgst: { $first: "$productDetails.sgst" },
                        limit: { $first: "$qty" },
                        branch: { $first: "$branch" },
                    },
                }
            ];

            if(search){
                const q = {
                    name: { $regex: search, $options: "i" }
                };
                cond.push({ $match: q });
            }

            if (req.query.maxPrice && req.query.minPrice) {
                const _MPX = {
                    $expr: {
                        $lte: [
                        {
                            $toDecimal: "$price",
                        },
                        parseInt(req.query.minPrice),
                        ],
                    }
                };
                const _MIX = {
                    $expr: {
                        $gte: [
                        {
                            $toDecimal: "$price",
                        },
                        parseInt(req.query.minPrice),
                        ],
                    }
                };
                cond.push({ $match: _MIX });
                cond.push({ $match: _MPX });

              } else if (req.query.maxPrice) {
                const _MPX = {
                    $expr: {
                        $lte: [
                        {
                            $toDecimal: "$price",
                        },
                        parseInt(req.query.minPrice),
                        ],
                    }
                };

                cond.push({ $match: _MPX });

              } else if (req.query.minPrice) {
                const _MIX = {
                    $expr: {
                        $gte: [
                        {
                            $toDecimal: "$price",
                        },
                        parseInt(req.query.minPrice),
                        ],
                    }
                };
                cond.push({ $match: _MIX });
              }

            cond.push({ $sort: { name: 1 } });

            BranchProduct.aggregate(cond)
                .exec((err, items) => {
                    console.log(err)

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
        } catch (exception) {
            console.log(exception)

            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    }
}

module.exports = branchStocksCalls;