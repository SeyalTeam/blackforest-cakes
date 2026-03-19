var Express = require('express');
var App = Express();
var helmet = require('helmet');
var cors = require('cors')
var BodyParser = require("body-parser");

//files
var apiV1 = require('./api/index');
var config = require('./config/config');

App.use(cors());
App.use(helmet());
App.use(BodyParser.urlencoded({ extended: true }));
App.use(BodyParser.json());

App.use('/api/v1', apiV1);

App.use(function(err, req, res, next) {
    if (!err.statusCode) err.statusCode = 500; // Sets a generic server error status code if none is part of the err
    res.status(err.statusCode).json({ message: err.message }); // sends our original err data
});

App.use('/', Express.static('uploads'))

App.get('/', function (req, res) {
    res.send('welcome to blackforest cake shop RestAPI...!')
});
  
App.listen(config.apiPort, () =>
    console.log(`App listening on port ${config.apiPort}!`),
);
