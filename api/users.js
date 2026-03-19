var Employee = require('../models/EmployeeModel');
var messages = require('../utils/messages');
var config = require('../config/config');
var io = require('socket.io-client');
var socket = io.connect(config.socketURL, {reconnect: true});

var userCalls = {
    getAllEmployees: (req, res, next) => {
        try {

            var cond = [];
            var sQuery = { $or: [{ 'emptype': 2 }, { 'emptype': 3 } ] };

            cond = [
                {
                    $match: sQuery
                },
                {
                    '$group': {
                        '_id':'$emptype',
                        "userDetails": { "$push": {name: '$firstname', id: '$_id'} },
                        count: { $sum: 1 }
                    }
                },
            ];

            Employee.aggregate(cond).exec((err, items) => {
                if (err) {
                    res.status(400).json({
                        message: err.message
                    });
                } else {
                    res.status(200).json({
                        message: messages.getAllMsg,
                        data: items
                    });
                }
            });
        } catch (exp) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },

    updateLocation: (req, res, next) => {
        var user = req.decoded.id;
        var bodyData = req.body;

        Employee.updateOne({ _id: user }, { $set: {  latitude: bodyData.latitude, longitude: bodyData.longitude } }, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                socket.emit('location_update', 'one user location updated');
                console.log('location updated.')
            }
        });
    }
};

module.exports = userCalls;