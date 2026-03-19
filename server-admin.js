var express = require('express');
var App = express();
var helmet = require('helmet');
var cors = require('cors')
var BodyParser = require("body-parser");

//files
var adminV1 = require('./admin-api/index');
var config = require('./config/config');

App.use(cors())
App.use(helmet());
App.use(BodyParser.urlencoded({ extended: true }));
App.use(BodyParser.json());

App.use('/admin/v1', adminV1);

App.use(function(err, req, res, next) {
    if (!err.statusCode) err.statusCode = 500; // Sets a generic server error status code if none is part of the err
    console.log(err)
    res.status(err.statusCode).json({ message: err.message }); // sends our original err data
});
  
App.use('/', express.static('uploads'))
App.use('/', express.static('documents'))

App.get('/', function (req, res) {
    res.send('welcome to blackforest cake shop admin RestAPI...!')
});
  
App.listen(config.adminPort, () =>
    console.log(`App listening on port ${config.adminPort}!`),
);
