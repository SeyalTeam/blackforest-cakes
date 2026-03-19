// packages
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

//files
var messages = require('../utils/messages');
var helpers = require('../utils/helpers');
var config = require('../config/config');
//models
var Admin = require('../models/AdminModel');

var saltRounds = 10;
var adminCalls = {
    createAdmin: (req, res, next) => {
        try{
            var incBody = req.body;
            if(incBody.name && incBody.email && incBody.password && helpers.validateEmail(incBody.email)){
                bcrypt.hash(incBody.password, saltRounds, (err, hash) => {
                    if(err){
                        res.status(400).json({
                            message: err.message
                        });
                    } else{
                        var adminCreate = new Admin({
                            name: incBody.name,
                            email: incBody.email,
                            password: hash
                        });
                        adminCreate.save((err, result) => {
                            if(err){
                                res.status(400).json({
                                    message: err.message
                                });
                            } else{
                                res.status(201).json({
                                    message: messages.saveMsg('admin')
                                });             
                            }
                        })
                    }
                });
            } else{
                res.status(422).json({
                    message: messages.validationMsg
                });
            }
        } catch(exception){
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },

    makeLogin: (req, res, next) => {
        try{
            var incBody = req.body;
            if(incBody.email && incBody.password && helpers.validateEmail(incBody.email)){
                Admin.findOne({ email: incBody.email}, (err, user) => {
                    if(err){
                        res.status(400).json({
                            message: err.message
                        });
                    } else if(user){
                        bcrypt.compare(incBody.password, user.password).then(match => {
                            if(match) {
                                var payload = { user: user.name, id: user._id };
                                var options = { expiresIn:  config.tokenExpDays };
                                var secret = config.jwtSecretKey;
                                var token = jwt.sign(payload, secret, options);

                                var resBody = {
                                    name: user.name,
                                    email: user.email,
                                    token: token
                                };

                                res.status(200).json({
                                    message: 'success',
                                    data: resBody
                                });        
                            } else{
                                res.status(401).json({
                                    message: 'Please check your email and password'
                                });        
                            }
                        });
                    } else{             
                        res.status(404).json({
                            message: messages.noDataMsg
                        });
                    }
                });
            } else{
                res.status(400).json({
                    message: messages.validationMsg
                });
            }
        } catch(exception){
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },

    changePassword: (req, res, next) => {
        try{
            var incBody = req.body;
            var loggedUser  = req.decoded;

            Admin.findById(loggedUser.id, (err, user) => {
                if(err){
                    res.status(400).json({
                        message: err.message
                    });
                } else if(user){
                    bcrypt.compare(incBody.oldpassword, user.password).then(match => {
                        if(match) {
                            bcrypt.hash(incBody.newpassword, saltRounds, (err, hash) => {
                                if(err){
                                    res.status(400).json({
                                        message: err.message
                                    });
                                } else{
                                    Admin.where({_id: loggedUser.id})
                                        .update({ password: hash}, (err, result) => {
                                            if(err){
                                                res.status(400).json({
                                                    message: err.message
                                                });
                                            }else{
                                                res.status(200).json({
                                                    message: 'Password updated'
                                                });
                                            }
                                        })
                                }
                            });        
                        } else{
                            res.status(401).json({
                                message: 'Old password not matched'
                            });        
                        }
                    });
                } else{             
                    res.status(404).json({
                        message: messages.noDataMsg
                    });
                }
            });

        } catch(exp){
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    }
};

module.exports = adminCalls;