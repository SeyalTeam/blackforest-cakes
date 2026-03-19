const mongoose = require("../config/database");
const fs = require("fs-extra");

const schema = {
  firstname: { type: mongoose.SchemaTypes.String, required: true },
  lastname: { type: mongoose.SchemaTypes.String, required: true },
  phone: { type: mongoose.SchemaTypes.String },
  address: { type: mongoose.SchemaTypes.String },
  email: { type: mongoose.SchemaTypes.String },
  branch: { type: mongoose.SchemaTypes.ObjectId, ref: "store" },
  empcode: { type: mongoose.SchemaTypes.String, required: true },
  emptype: { type: mongoose.SchemaTypes.Number, required: true }, // 1 => waiter 2 => chef 3 => delivery boy 4 => branch head 5 => cashier
  username: { type: mongoose.SchemaTypes.String, unique: true, required: true },
  password: { type: mongoose.SchemaTypes.String, required: true },
  image: { type: mongoose.SchemaTypes.String },
  isOTPLogin: { type: mongoose.SchemaTypes.Boolean },
  deviceToken: { type: mongoose.SchemaTypes.String },
  latitude: { type: mongoose.SchemaTypes.String },
  longitude: { type: mongoose.SchemaTypes.String },
  created_at: { type: Date, default: Date.now },  
  isLoginNow: { type: mongoose.SchemaTypes.Boolean, default: false },
  isEnable: { type: mongoose.SchemaTypes.Boolean, default: true },
};

const collectionName = "employee";
const employeeSchema = mongoose.Schema(schema);

employeeSchema.pre("save", function (next) {
  var self = this;
  var self = this;
  Employee.find({ $or: [{ username: self.username }] }, function (err, docs) {
    if (!docs.length) {
      next();
    } else {
      if (self.image) {
        const path = "./uploads/" + self.image;
        fs.remove(path, (err) => {
          if (err) return console.log(err);
        });
      }
      next(new Error("Employee exists!"));
    }
  });
});

const Employee = mongoose.model(collectionName, employeeSchema);

module.exports = Employee;
