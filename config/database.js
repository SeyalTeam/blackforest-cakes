var Mongoose = require('mongoose');
var config = require('./config');

var globalKey = '__blackforestMongoosePromise';

if (config.dbString) {
  if (!global[globalKey]) {
    global[globalKey] = Mongoose.connect(config.dbString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    }).then(function() {
      console.log('> successfully opened the database');
      return Mongoose;
    }).catch(function(err) {
      console.log('> error occurred from the database');
      console.log(err);
      throw err;
    });
  }
} else {
  console.log('> DB_STRING is not configured');
}

module.exports = Mongoose;
