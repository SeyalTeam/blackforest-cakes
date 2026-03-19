var Order = require('../models/OrderModel');
var Employee = require('../models/EmployeeModel');
var Branch = require('../models/StoreModel');
var messages = require('../utils/messages');

var dashboardCalls = {
    getAllBranch: (req, res, next) => {
        try {
            Branch.countDocuments((err, result) => {
                if(err){

                } else{
                    res.status(200).json({
                        message: 'success',
                        count: result
                    });
                }
            })
        } catch(exp){
            console.log(exp)
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    getAllEmployees: (req, res, next) => {
        try {
            Employee.countDocuments((err, result) => {
                if(err){

                } else{
                    res.status(200).json({
                        message: 'success',
                        count: result
                    });
                }
            })
        } catch(exp){
            console.log(exp)
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    
    getAllOrders: (req, res, next) => {
        try {
            Order.countDocuments((err, result) => {
                if(err){

                } else{
                    res.status(200).json({
                        message: 'success',
                        count: result
                    });
                }
            })
        } catch(exp){
            console.log(exp)
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    getAllOrdersPending: (req, res, next) => {
        try {
            Order.countDocuments({status: '1'},(err, result) => {
                if(err){

                } else{
                    res.status(200).json({
                        message: 'success',
                        count: result
                    });
                }
            })
        } catch(exp){
            console.log(exp)
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },

    getAllOrdersByMonth: (req, res, next) => {
        let dateNow = new Date();
        let prevDate =  dateNow.setMonth(dateNow.getMonth() - 12);
        prevDate = new Date(prevDate);

        const lastHalfQ = {
            'created_at': { $gt: prevDate }
        };  

        Order.aggregate([
            {
                $match: lastHalfQ
            },
            {
                '$group': {
                    '_id': {
                        'month': { $month: "$created_at" },
                    },         
                    'count': { $sum: 1 }
                }
            },
            { $sort : { '_id.month' : 1 } }
        ], (err, schoolData) => {

            if(err){
                
            } else{
                res.status(200).json(({
                    message: 'dashboard rating chart data for order',
                    data: schoolData
                }))
            }
        });
    }
};

module.exports = dashboardCalls;