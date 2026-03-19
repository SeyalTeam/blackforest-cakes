const mongoose = require("../config/database");

const productSchema = new mongoose.Schema({
  _id: { type: mongoose.SchemaTypes.ObjectId, ref: "product", required: true },
  qty: { type: mongoose.SchemaTypes.String, required: true },
  rate: { type: mongoose.SchemaTypes.String, required: true },
  price: { type: mongoose.SchemaTypes.String, required: true },
});

const pastrySchema = new mongoose.Schema({
  _id: { type: mongoose.SchemaTypes.ObjectId, ref: "pastry", required: true },
  qty: { type: mongoose.SchemaTypes.String, required: true },
  rate: { type: mongoose.SchemaTypes.String, required: true },
  price: { type: mongoose.SchemaTypes.String, required: true },
});

const addonSchema = new mongoose.Schema({
  _id: { type: mongoose.SchemaTypes.ObjectId, ref: "addons", required: true },
  qty: { type: mongoose.SchemaTypes.String, required: true },
  rate: { type: mongoose.SchemaTypes.String, required: true },
  price: { type: mongoose.SchemaTypes.String, required: true },
});

const schema = {
  form_no: { type: mongoose.SchemaTypes.String, required: true, unique: true },
  customer_name: { type: mongoose.SchemaTypes.String, required: true },
  customer_phone: { type: mongoose.SchemaTypes.String, required: true },
  customer_email: { type: mongoose.SchemaTypes.String },
  address: { type: mongoose.SchemaTypes.String, required: true },
  product: productSchema,
  pastry: pastrySchema,
  isPastryItem: { type: mongoose.SchemaTypes.Boolean, default: false },
  addon: [addonSchema],
  delivery_date: { type: Date, required: true },
  delivery_time: { type: Date, required: true },
  wordings: { type: mongoose.SchemaTypes.String },
  birthday_date: { type: Date },
  cake_model: { type: mongoose.SchemaTypes.String },
  flavour: { type: mongoose.SchemaTypes.String },
  weight: { type: mongoose.SchemaTypes.String },
  type: { type: mongoose.SchemaTypes.String }, // cream type
  alteration: { type: mongoose.SchemaTypes.String },
  special_care: { type: mongoose.SchemaTypes.String },
  status: { type: mongoose.SchemaTypes.String }, //1 > pending(Ordered) 2>cancel 3> completed 4> prepared 5> ready 6 > Picked 7> Delivered 8> Not delivered
  amount: { type: mongoose.SchemaTypes.String, require: true },
  advance: { type: mongoose.SchemaTypes.String, require: true },
  balance: { type: mongoose.SchemaTypes.String, require: true },
  discount: { type: mongoose.SchemaTypes.String },
  branch: { type: mongoose.SchemaTypes.ObjectId, ref: "store", required: true },
  sales_man: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "employee",
    required: true,
  },
  delivery_man: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" },
  prepared_by: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" },
  delivery_type: { type: mongoose.SchemaTypes.String }, //1 > home 2> shop
  rating: { type: mongoose.SchemaTypes.Number }, // customer rating
  order_doc: { type: mongoose.SchemaTypes.String }, // pdf copy of order
  delivery_location: {
    latitude: { type: mongoose.SchemaTypes.String },
    longitude: { type: mongoose.SchemaTypes.String },
  },
  cakeHeight: { type: mongoose.SchemaTypes.String },
  cakeWidth: { type: mongoose.SchemaTypes.String },
  created_at: { type: Date, default: Date.now },
};

// product, addon[]

const collectionName = "order";
const orderSchema = mongoose.Schema(schema);

const Order = mongoose.model(collectionName, orderSchema);

module.exports = Order;
