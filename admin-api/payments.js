var PastryOrder = require('../models/PastriesModel');
var StockOrder = require('../models/StockordersModel');
var BranchPayment = require('../models/BranchPaymentModel');
var Mongoose = require('mongoose');
var messages = require('../utils/messages');
var helpers = require('../utils/helpers');

var payments = {
    getYearlyPaymentInfoByBranch: (req, res) => {
        try {
            var year = req.query.year;
            var branch = req.query.branch;
            var month = req.query.month;

            var sQuery = {};
            var paymentQuery = {};

            if(branch){
                sQuery = { created_by: new Mongoose.Types.ObjectId(branch) };
                paymentQuery.branch = branch;
            }
            
            var match = {
                $match: sQuery
            };

            var finalStage = {};

            if(year){
                finalStage = {
                    year: parseInt(year)
                };
                paymentQuery.year = year;
            }
            if(month){
                paymentQuery.month = month;
                finalStage.month = parseInt(month)
            }

            
            
            var project = {
                $project: {
                    year: {
                        $year: '$created_at'
                    },
                    month: {
                        $month: '$created_at'
                    },
                    created_by: 1,
                    pastry: 1,
                    'employees.firstname': 1,
                    'employees.lastname': 1
                }
            };

            var lookups = {
                "$lookup": {
                    "from": "employees",
                    "localField": "created_by",
                    "foreignField": "_id",
                    "as": "employees"
                }
            };

            var unwinds  = {
                "$unwind": {
                    path: "$employees",
                    "preserveNullAndEmptyArrays": true
                }
            };

            var cond = [
                match,
                lookups,
                unwinds,
                project,
                {
                    $group: {
                        _id: { month: '$month', branch: '$created_by' },
                        branchDetails: { $first: '$employees' },
                        liveOrders: { $addToSet: "$pastry" },
                        year: { $first: '$year' },
                        month: { $first: '$month' }
                    }
                },
                {
                    $match: finalStage
                }
            ];

            var cond2 = [
                match,
                lookups,
                unwinds,
                project,
                {
                    $group: {
                        _id: { month: '$month', branch: '$created_by' },
                        branchDetails: { $first: '$employees' },
                        stockOrders: { $addToSet: "$pastry" },
                        year: { $first: '$year' },
                        month: { $first: '$month' }
                    }
                },
                {
                    $match: finalStage
                }
            ];

            PastryOrder.aggregate(cond).exec((err, pastriesData) => {
                if (err) {
                    res.status(400).json({
                        message: err.message
                    });
                } else {
                    StockOrder.aggregate(cond2).exec((err, stockOrderData) => {
                        if (err) {
                            res.status(400).json({
                                message: err.message
                            });
                        } else {
                            const combinedArray = pastriesData.concat(stockOrderData);
                            let branchesData = [];

                            if (combinedArray.length > 0) {
                                combinedArray.forEach(item => {
                                    branchesData.push({ branchDetail:item.branchDetails, branch: item._id.branch, month: item._id.month, year: item.year});
                                });

                                branchesData = branchesData.filter((v,i,a)=>a.findIndex(t=>((t.month === v.month) && ((t.branch).toString() === (v.branch).toString())))===i)
                              
                                combinedArray.forEach(itemAll => {
                                    branchesData.forEach(itemBranch => {
                                        if (((itemAll._id.branch).toString() === (itemBranch.branch).toString()) && itemBranch.month === itemAll._id.month) {
                                            if (itemAll.liveOrders) {
                                                itemBranch.liveOrders = itemAll.liveOrders;
                                            }

                                            if (itemAll.stockOrders) {
                                                itemBranch.stockOrders = itemAll.stockOrders;
                                            }

                                        }
                                    });
                                });

                            }

                            BranchPayment.find(paymentQuery, (err, paymentData) => {
                                if (err) {
                                    res.status(400).json({
                                        message: err.message
                                    });
                                } else if (paymentData) {
                                    if(branchesData.length > 0 && paymentData.length > 0){
                                        branchesData.forEach(info => {
                                            paymentData.forEach(payInfo => {
                                                if(payInfo.month == info.month && ((payInfo.branch).toString() === (info.branch).toString())){
                                                    info.paymentDetails = payInfo
                                                }
                                            })
                                        })
                                    }
                                    res.status(200).json({
                                        message: 'success',
                                        data: branchesData
                                    });
                                } else {
                                    res.status(200).json({
                                        message: 'success',
                                        data: branchesData
                                    });
                                }
                            });
                        }
                    })
                }
            })

        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }

    },
    payBalanceAmount: (req, res) => {
        try {
            const bodyData = req.body;
            BranchPayment.findOne({ year: bodyData.year, branch: bodyData.branch, month: bodyData.month }, (err, response) => {
                if (err) {
                    res.status(400).json({
                        message: err.message
                    });
                } else if (response) {
                    const alreadyPaid = parseFloat(response.totalcost) - parseFloat(response.balanceAmount);
                    const currentPay = parseFloat(bodyData.payment);
                    const balanceAmount = parseFloat(currentPay) + parseFloat(alreadyPaid);
                    const newBalanceAmount = parseFloat(bodyData.totalcost) - parseFloat(balanceAmount);

                    BranchPayment.updateOne({ _id: response._id }, { $set: { totalcost: bodyData.totalcost, balanceAmount: newBalanceAmount } }, (err, updated) => {
                        if (err) {
                            res.status(400).json({
                                message: err.message
                            });
                        } else {
                            res.status(200).json({
                                message: 'Payment updated'
                            });
                        }
                    })
                } else {
                    const saveData = {
                        year: bodyData.year,
                        branch: bodyData.branch,
                        month: bodyData.month,
                        totalcost: bodyData.totalcost,
                        balanceAmount: parseFloat(bodyData.totalcost) - parseFloat(bodyData.payment)
                    }
                    const newPayment = new BranchPayment(saveData);
                    newPayment.save((err, result) => {
                        if (err) {
                            res.status(400).json({
                                message: err.message
                            });
                        } else {
                            res.status(200).json({
                                message: messages.saveMsg('Payment')
                            });
                        }
                    })
                }
            })

        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    }
};

module.exports = payments;