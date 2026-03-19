const mongoose = require("../config/database");

const pastrySchema = new mongoose.Schema({
  p_id: { type: mongoose.SchemaTypes.ObjectId, ref: "pastry", required: true },
  category: { type: mongoose.SchemaTypes.ObjectId, ref: "productcategory" },
  qty: [
    {
      items: { type: mongoose.SchemaTypes.String },
      confirmed: { type: mongoose.SchemaTypes.Boolean },
    },
  ],
});

const schema = {
  created_by: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" }, //consider as branch
  pastry: [pastrySchema],
  return_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
};

const collectionName = "returnorder";

const orderSchema = mongoose.Schema(schema);

const ReturnOrder = mongoose.model(collectionName, orderSchema);

module.exports = ReturnOrder;
