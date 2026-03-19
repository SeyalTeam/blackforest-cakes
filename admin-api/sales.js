const messages = require("../utils/messages");
const Sales = require("../models/SalesModel");
const Mongoose = require("mongoose");
const Employee = require("../models/EmployeeModel");
var Pastries = require("../models/PastryProduct");

const salesCalls = {
    getProductsForDropDown: (req, res, next) => {
        try {
            let category = req.query.category ? new Mongoose.Types.ObjectId(req.query.category) : '';
            let q = {};
            if (category) {
                q = { category: category }
            }

            Pastries.find(q, "name", (err, collection) => {
                if (err) {
                    res.status(400).json({
                        message: err.message,
                    });
                } else {
                    res.status(200).json({
                        message: "success",
                        data: collection,
                    });
                }
            });
        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg,
            });
        }
    },
    listorders: (req, res, next) => {
        var currentPage =
            req.query && req.query.page ? parseInt(req.query.page) : 0;
        var limit = 15;
        var skip = currentPage * limit;
        var cashier = req.query.cashier ? req.query.cashier : "";
        var billNo = req.query.billNo ? req.query.billNo : "";
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var salesman = req.query.salesman ? req.query.salesman : "";
        var terminal = req.query.terminal ? req.query.terminal : "";

        var sQuery = {};

        if (cashier) {
            sQuery.cashier = new Mongoose.Types.ObjectId(cashier);
        }

        if (salesman) {
            sQuery.waiter = new Mongoose.Types.ObjectId(salesman);
        }

        if (terminal) {
            sQuery.salesLoginBy = new Mongoose.Types.ObjectId(terminal);
        }

        if (billNo) {
            sQuery.billNo = { $regex: billNo, $options: "i" };
        }



        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }

        const cond = [
            {
                $match: sQuery,
            },
            {
                $facet: {
                    paginatedResults: [
                        { $sort: { created_at: -1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        {
                            $count: "count",
                        },
                    ],
                },
            }
        ];

        Sales.aggregate(cond).exec((err, items) => {
            if (err) {
                res.status(400).json({
                    message: err.message,
                });
            } else {
                res.status(200).json({
                    message: messages.getAllMsg,
                    data: items[0].paginatedResults,
                    currentPage: currentPage,
                    total: items[0] && items[0].totalCount && items[0].totalCount[0] ? items[0].totalCount[0].count : 0
                });
            }
        });

    },
    getAllCashier: (req, res, next) => {
        try {
            Employee.find({ emptype: 5 }, "firstname empcode isLoginNow", (err, collection) => {
                if (err) {
                    res.status(400).json({
                        message: err.message,
                    });
                } else {
                    res.status(200).json({
                        message: "success",
                        data: collection,
                    });
                }
            });
        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg,
            });
        }
    },
    getAllManagers: (req, res, next) => {
        try {
            Employee.find({ emptype: 4 }, "firstname empcode isLoginNow", (err, collection) => {
                if (err) {
                    res.status(400).json({
                        message: err.message,
                    });
                } else {
                    res.status(200).json({
                        message: "success",
                        data: collection,
                    });
                }
            });
        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg,
            });
        }
    },
    getAllTerminalMan: (req, res, next) => {
        try {
            Employee.find({ emptype: 4 }, "firstname empcode isLoginNow", (err, collection) => {
                if (err) {
                    res.status(400).json({
                        message: err.message,
                    });
                } else {
                    res.status(200).json({
                        message: "success",
                        data: collection,
                    });
                }
            });
        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg,
            });
        }
    },
    getAllWaiter: (req, res, next) => {
        try {
            // branch: user.branch
            let q = {
                emptype: 1
            };

            Employee.find(q, "firstname empcode isLoginNow", (err, collection) => {
                if (err) {
                    res.status(400).json({
                        message: err.message,
                    });
                } else {
                    res.status(200).json({
                        message: "success",
                        data: collection,
                    });
                }
            });
        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg,
            });
        }
    },
    getAllChefs: (req, res, next) => {
        try {
            // branch: user.branch
            let q = {
                emptype: 2
            };

            Employee.find(q, "firstname empcode isLoginNow", (err, collection) => {
                if (err) {
                    res.status(400).json({
                        message: err.message,
                    });
                } else {
                    res.status(200).json({
                        message: "success",
                        data: collection,
                    });
                }
            });
        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg,
            });
        }
    },
    reportByGroup: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};
        var categories =
            req.query && req.query.categories ? req.query.categories : [];

        var branch = req.query.branch ? req.query.branch : "";

        if (branch) {
            sQuery.branch = new Mongoose.Types.ObjectId(branch);
        }

        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }

        var categoryQuery = {};

        if (req.query.catId) {
            categoryQuery = {
                "items.catId": new Mongoose.Types.ObjectId(req.query.catId),
            };
        }

        if (categories && categories.length > 0) {
            const temp = [];
            categories.forEach((item) => {
                temp.push(new Mongoose.Types.ObjectId(item))
            })
            categoryQuery = {
                "items.catId": { $in: temp }
            };
        }


        var cond = [
            {
                $match: sQuery,
            },
            {
                $unwind: {
                    path: "$items",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: categoryQuery
            },
            {
                $lookup: {
                    from: "productcategories",
                    localField: "items.catId",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            {
                $lookup: {
                    from: "stores",
                    localField: "branch",
                    foreignField: "_id",
                    as: "store",
                },
            },
            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$items.catId",
                    branchWise: {
                        $push: {
                            totalCost: {
                                "$sum": {
                                    "$toDouble": "$items.totalCost"
                                }
                            },
                            discount: {
                                "$sum": {
                                    "$toDouble": "$discount"
                                }
                            },
                            branch: "$branch",
                            branchDetails: "$store",
                            qty: {
                                $sum: {
                                    "$toDouble": "$items.qty"
                                }
                            },
                        }
                    },
                    item: { $first: "$items.name" },
                    item_id: { $first: "$items._id" },
                    code: { $first: "$items.code" },
                    categoryDetails: { $first: "$categoryDetails" },
                    catId: { $first: "$items.catId" },
                    qty: {
                        "$sum": {
                            "$toDouble": "$items.qty"
                        }
                    },
                    totalCost: {
                        "$sum": {
                            "$toDouble": "$items.totalCost"
                        }
                    },
                    discount: {
                        "$sum": {
                            "$toDouble": "$items.discount"
                        }
                    },
                },
            }
        ];



        Sales.aggregate(cond).exec((err, items) => {
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
    },
    reportByProduct: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};
        var products =
            req.query && req.query.products ? req.query.products : [];


        var branch = req.query.branch ? req.query.branch : "";

        if (branch) {
            sQuery.branch = new Mongoose.Types.ObjectId(branch);
        }

        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);
            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }
        var prodFilter = {}
        if (req.query.product) {
            prodFilter = {
                "items._id": new Mongoose.Types.ObjectId(req.query.product),
            }
        }


        if (products && products.length > 0) {
            const temp = [];
            products.forEach((item) => {
                temp.push(new Mongoose.Types.ObjectId(item))
            })
            prodFilter = {
                "items._id": { $in: temp }
            };
        }

        var cond = [
            {
                $match: sQuery,
            },
            {
                $unwind: {
                    path: "$items",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: prodFilter
            },
            {
                $lookup: {
                    from: "stores",
                    localField: "branch",
                    foreignField: "_id",
                    as: "store",
                },
            },
            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$items._id",
                    item: { $first: "$items.name" },
                    branchWise: {
                        $push: {
                            totalCost: {
                                "$sum": {
                                    "$toDouble": "$items.totalCost"
                                }
                            },
                            discount: {
                                "$sum": {
                                    "$toDouble": "$items.discount"
                                }
                            },
                            branch: "$branch",
                            branchDetails: "$store",
                            qty: {
                                $sum: {
                                    "$toDouble": "$items.qty"
                                }
                            },
                        }
                    },
                    item_id: { $first: "$items._id" },
                    code: { $first: "$items.code" },
                    catId: { $first: "$items.catId" },
                    qty: {
                        "$sum": {
                            "$toDouble": "$items.qty"
                        }
                    },
                    totalCost: {
                        "$sum": {
                            "$toDouble": "$items.totalCost"
                        }
                    },
                    discount: {
                        "$sum": {
                            "$toDouble": "$items.discount"
                        }
                    },
                    orderDate: { $first: "$orderDate" }
                },
            }];


        Sales.aggregate(cond).exec((err, items) => {
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

    },
    reportBySalesMan: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};
        var salesLoginBy = req.query.salesMan ? req.query.salesMan : "";
        var branch = req.query.branch ? req.query.branch : "";
        var discount = req.query.discount ? req.query.discount : "";

        if (branch) {
            sQuery.branch = new Mongoose.Types.ObjectId(branch);
        }

        if (discount == 1) {
            sQuery.discount = { $gt: 0 }
        }

        if (salesLoginBy) {
            sQuery.waiter = new Mongoose.Types.ObjectId(salesLoginBy);
        }



        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }


        var cond = [
            {
                $match: sQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "waiter",
                    foreignField: "_id",
                    as: "salesMan",
                },
            },
            {
                $unwind: {
                    path: "$salesMan",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "stores",
                    localField: "branch",
                    foreignField: "_id",
                    as: "store",
                },
            },
            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    "_id": "$waiter",
                    branchWise: {
                        $push: {
                            totalCost: {
                                "$sum": {
                                    "$toDouble": "$totalProductSellingPrice"
                                }
                            },
                            discount: {
                                "$sum": {
                                    "$toDouble": "$discount"
                                }
                            },
                            branch: "$branch",
                            branchDetails: "$store",
                            qty: { $sum: "$totalItems" },
                        }
                    },
                    emp: { $first: "$salesMan" },
                    totalCost: {
                        "$sum": {
                            "$toDouble": "$totalProductSellingPrice"
                        }
                    },
                    netCost: {
                        "$sum": {
                            "$toDouble": "$netAmount"
                        }
                    },
                    discount: {
                        "$sum": {
                            "$toDouble": "$discount"
                        }
                    },

                    qty: {
                        "$sum": "$totalItems"
                    }
                },
            },
            {
                "$project": {
                    "_id": 1,
                    branchWise: 1,
                    "totalCost": 1,
                    netCost: 1,
                    qty: 1,
                    discount: 1,
                    "emp._id": 1,
                    "emp.firstname": 1,
                }
            }
        ];


        Sales.aggregate(cond).exec((err, items) => {
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


    },
    reportByCashier: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};
        var cashier = req.query.cashier ? req.query.cashier : "";

        if (cashier) {
            sQuery.cashier = new Mongoose.Types.ObjectId(cashier);
        }
        var branch = req.query.branch ? req.query.branch : "";
        var discount = req.query.discount ? req.query.discount : "";

        if (branch) {
            sQuery.branch = new Mongoose.Types.ObjectId(branch);
        }

        if (discount == 1) {
            sQuery.discount = { $gt: 0 }
        }


        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }


        var cond = [
            {
                $match: sQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "cashier",
                    foreignField: "_id",
                    as: "cashierDetails",
                },
            },
            {
                $unwind: {
                    path: "$cashierDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "stores",
                    localField: "branch",
                    foreignField: "_id",
                    as: "store",
                },
            },
            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    "_id": "$cashier",
                    branchWise: {
                        $push: {
                            totalCost: {
                                "$sum": {
                                    "$toDouble": "$totalProductSellingPrice"
                                }
                            },
                            branch: "$branch",
                            branchDetails: "$store",
                            qty: { $sum: "$totalItems" },
                        }
                    },
                    emp: { $first: "$cashierDetails" },
                    totalCost: {
                        "$sum": {
                            "$toDouble": "$totalProductSellingPrice"
                        }
                    },
                    discount: {
                        "$sum": {
                            "$toDouble": "$discount"
                        }
                    },
                    netCost: {
                        "$sum": {
                            "$toDouble": "$netAmount"
                        }
                    },
                    qty: {
                        "$sum": "$totalItems"
                    }
                },
            },
            {
                "$project": {
                    "_id": 1,
                    "totalCost": 1,
                    branchWise: 1,
                    discount: 1,
                    netCost: 1,
                    qty: 1,
                    "emp._id": 1,
                    "emp.firstname": 1,
                }
            }

        ];


        Sales.aggregate(cond).exec((err, items) => {
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



    },
    reportByBranch: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};
        var branch = req.query.branch ? req.query.branch : "";
        if (!branch) {
            res.status(404).json({
                message: 'Choose a branch',
                data: []
            });
        } else {
            sQuery.salesLoginBy = new Mongoose.Types.ObjectId(branch);

            if (orderFromDate) {
                var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

                sQuery.orderDate = {
                    $gte: new Date(firstDate),
                };
            }

            if (orderToDate) {
                var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

                sQuery.orderDate = {
                    $lte: new Date(stopDate)
                };
            }

            if (orderFromDate && orderToDate) {
                var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
                var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

                sQuery.orderDate = {
                    $gte: new Date(firstDate),
                    $lte: new Date(stopDate),
                };
            }

            var cond = [
                {
                    $match: sQuery,
                },
                {
                    $group: {
                        _id: "$salesLoginBy",
                        count: { $sum: 1 },
                        totalCost: {
                            "$sum": {
                                "$toDouble": "$totalProductSellingPrice"
                            }
                        },
                        netCost: {
                            "$sum": {
                                "$toDouble": "$netAmount"
                            }
                        }
                    },
                }
            ];


            Sales.aggregate(cond).exec((err, items) => {
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
        }

    },
    reportByBill: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};

        var branch = req.query.branch ? req.query.branch : "";
        var discount = req.query.discount ? req.query.discount : "";

        if (branch) {
            sQuery.branch = new Mongoose.Types.ObjectId(branch);
        }

        if (discount == 1) {
            sQuery.discount = { $gt: 0 }
        }

        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }

        var cond = [
            {
                $match: sQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "salesLoginBy",
                    foreignField: "_id",
                    as: "stores",
                },
            },
            {
                $lookup: {
                    from: "stores",
                    localField: "branch",
                    foreignField: "_id",
                    as: "store",
                },
            },
            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    "_id": "$salesLoginBy",
                    branchWise: {
                        $push: {
                            totalCost: {
                                "$sum": {
                                    "$toDouble": "$totalProductSellingPrice"
                                }
                            },
                            branch: "$branch",
                            branchDetails: "$store",
                            qty: { $sum: 1 },
                        }
                    },
                    branchName: { $first: "$stores" },
                    totalCost: {
                        "$sum": {
                            "$toDouble": "$totalProductSellingPrice"
                        }
                    },
                    netCost: {
                        "$sum": {
                            "$toDouble": "$netAmount"
                        }
                    },
                    discount: {
                        "$sum": {
                            "$toDouble": "$discount"
                        }
                    },
                    qty: {
                        "$sum": 1
                    }
                },
            },
            {
                "$project": {
                    "_id": 1,
                    branchWise: 1,
                    "branchName._id": 1,
                    "branchName.firstname": 1,
                    "totalCost": 1,
                    netCost: 1,
                    qty: 1,
                    discount: 1
                }
            }
        ];


        Sales.aggregate(cond).exec((err, items) => {
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

    },
    reportByTime: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};

        var branch = req.query.branch ? req.query.branch : "";

        if (branch) {
            sQuery.branch = new Mongoose.Types.ObjectId(branch);
        }

        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }

        var cond = [
            {
                $match: sQuery,
            },
            {
                $lookup: {
                    from: "stores",
                    localField: "branch",
                    foreignField: "_id",
                    as: "store",
                },
            },
            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                "$project": {
                    // "h": { "$hour": "$created_at" },
                    "h": {
                        $hour: { date: "$created_at", timezone: "+05:30" }
                    },
                    "store": 1,
                    "_id": 1,
                    "totalProductSellingPrice": 1,
                    discount: 1
                }
            },
            {
                $group: {
                    "_id": { "hour": "$h" },
                    count: { $sum: 1 },
                    branchWise: {
                        $push: {
                            totalCost: {
                                "$sum": {
                                    "$toDouble": "$totalProductSellingPrice"
                                }
                            },
                            discount: {
                                "$sum": {
                                    "$toDouble": "$discount"
                                }
                            },
                            branch: "$branch",
                            branchDetails: "$store",
                            qty: { $sum: 1 },
                        }
                    },
                    totalCost: {
                        "$sum": {
                            "$toDouble": "$totalProductSellingPrice"
                        }
                    },
                },
            },
            { $sort: { '_id.hour': 1 } }
        ];


        Sales.aggregate(cond).exec((err, items) => {
            if (err) {
                res.status(400).json({
                    message: err.message,
                });
            } else {
                let totalAmt = 0;

                if (items.length > 0) {
                    items.forEach(i => {
                        totalAmt = totalAmt + i.totalCost;
                    });
                }
                res.status(200).json({
                    message: messages.getAllMsg,
                    data: items,
                    totalCost: totalAmt
                });
            }
        });

    },
    reportByManager: (req, res, next) => {
        var orderFromDate = req.query.orderFromDate ? req.query.orderFromDate : "";
        var orderToDate = req.query.orderToDate ? req.query.orderToDate : "";
        var sQuery = {};
        var salesLoginBy = req.query.salesMan ? req.query.salesMan : "";
        var branch = req.query.branch ? req.query.branch : "";
        var discount = req.query.discount ? req.query.discount : "";

        if (branch) {
            sQuery.branch = new Mongoose.Types.ObjectId(branch);
        }

        if (discount == 1) {
            sQuery.discount = { $gt: 0 }
        }

        if (salesLoginBy) {
            sQuery.salesLoginBy = new Mongoose.Types.ObjectId(salesLoginBy);
        }



        if (orderFromDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
            };
        }

        if (orderToDate) {
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $lte: new Date(stopDate)
            };
        }

        if (orderFromDate && orderToDate) {
            var firstDate = new Date(orderFromDate).setHours(0, 0, 0, 0);
            var stopDate = new Date(orderToDate).setHours(23, 59, 59, 999);

            sQuery.orderDate = {
                $gte: new Date(firstDate),
                $lte: new Date(stopDate),
            };
        }


        var cond = [
            {
                $match: sQuery,
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "salesLoginBy",
                    foreignField: "_id",
                    as: "salesMan",
                },
            },
            {
                $unwind: {
                    path: "$salesMan",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "stores",
                    localField: "branch",
                    foreignField: "_id",
                    as: "store",
                },
            },
            {
                $unwind: {
                    path: "$store",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    "_id": "$salesLoginBy",
                    branchWise: {
                        $push: {
                            totalCost: {
                                "$sum": {
                                    "$toDouble": "$totalProductSellingPrice"
                                }
                            },
                            branch: "$branch",
                            branchDetails: "$store",
                            qty: { $sum: 1 },
                        }
                    },
                    emp: { $first: "$salesMan" },
                    totalCost: {
                        "$sum": {
                            "$toDouble": "$totalProductSellingPrice"
                        }
                    },
                    qty: { $sum: 1 },
                    netCost: {
                        "$sum": {
                            "$toDouble": "$netAmount"
                        }
                    },
                    discount: {
                        "$sum": {
                            "$toDouble": "$discount"
                        }
                    }
                },
            },
            {
                "$project": {
                    "_id": 1,
                    "totalCost": 1,
                    discount: 1,
                    netCost: 1,
                    branchWise: 1,
                    discount: 1,
                    qty: 1,
                    "emp._id": 1,
                    "emp.firstname": 1,
                }
            }
        ];


        Sales.aggregate(cond).exec((err, items) => {
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


    },
};

module.exports = salesCalls;
