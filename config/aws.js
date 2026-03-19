var AWS = require('aws-sdk');
var config = require('./config');

AWS.config.update({
    accessKeyId: config.awsS3accessKey,
    secretAccessKey: config.awsS3SecretKey
});

module.exports = AWS;