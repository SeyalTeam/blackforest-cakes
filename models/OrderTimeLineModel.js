const mongoose = require("../config/database");

const schema = {
  status: { type: mongoose.SchemaTypes.Number, required: true },
  statusText: { type: mongoose.SchemaTypes.String },
  orderId: { type: mongoose.SchemaTypes.ObjectId, ref: "order" },
  createdBy: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" },
  created_at: { type: Date, default: Date.now },
};

const collectionName = "OrderTimeline";
const _schema = mongoose.Schema(schema);

const OrderTimeline = mongoose.model(collectionName, _schema);

module.exports = OrderTimeline;
