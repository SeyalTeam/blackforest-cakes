const mongoose = require("../config/database");

const pastrySchema = new mongoose.Schema({
  _id: { type: mongoose.SchemaTypes.ObjectId, ref: "pastry", required: true },
  qty: { type: mongoose.SchemaTypes.String, required: true },
  inStock: { type: mongoose.SchemaTypes.String },
  sendQty: { type: mongoose.SchemaTypes.String, required: true },
  total: { type: mongoose.SchemaTypes.String, required: true },
  sendTotal: { type: mongoose.SchemaTypes.String, required: true },
  price: { type: mongoose.SchemaTypes.String, required: true },
  delivery_date: { type: Date, default: Date.now },
  status: { type: mongoose.SchemaTypes.String }, //1 > pending 2>completed
  updated_at: { type: Date },
  isReceived: { type: mongoose.SchemaTypes.Number, default: 1 }, //1 > not 2>received
  receivedTime: { type: Date },
  ackQty: { type: mongoose.SchemaTypes.String },

});

const schema = {
  form_no: { type: mongoose.SchemaTypes.String, required: true, unique: true },
  created_by: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" }, //consider as branch
  category: { type: mongoose.SchemaTypes.ObjectId, ref: "productcategory" },
  qty: { type: mongoose.SchemaTypes.String },
  sendQty: { type: mongoose.SchemaTypes.String },
  pastry: [pastrySchema],
  total: { type: mongoose.SchemaTypes.String },
  sendTotal: { type: mongoose.SchemaTypes.String },
  messages: { type: mongoose.SchemaTypes.String },
  created_at: { type: Date, default: Date.now },
  bill_status: { type: mongoose.SchemaTypes.String }, //1 > pending 2>completed
  bill_no: { type: mongoose.SchemaTypes.String, required: true },
};

const collectionName = "pastries_order";

const orderSchema = mongoose.Schema(schema);

const PastryOrder = mongoose.model(collectionName, orderSchema);

module.exports = PastryOrder;
