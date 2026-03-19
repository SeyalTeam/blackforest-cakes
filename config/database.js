var Mongoose = require('mongoose');
var config = require('./config');

Mongoose.connect(config.dbString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

var db = Mongoose.connection;

db.on("error", () => {
  console.log("> error occurred from the database");
});

db.once("open", () => {
  console.log("> successfully opened the database");
});

module.exports = Mongoose;
