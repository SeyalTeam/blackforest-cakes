const mongoose = require("../config/database");

const itemsSchema = new mongoose.Schema({
  _id: { type: mongoose.SchemaTypes.ObjectId, ref: "pastry", required: true },
  catId: { type: mongoose.SchemaTypes.ObjectId, ref: "productcategory", required: true },
  name: { type: mongoose.SchemaTypes.String },
  code: { type: mongoose.SchemaTypes.String },
  qty: { type: mongoose.SchemaTypes.String, required: true },
  costPrice: { type: mongoose.SchemaTypes.String, required: true },
  sellingPrice: { type: mongoose.SchemaTypes.String, required: true },
  totalCost: { type: mongoose.SchemaTypes.String, required: true },
  isGstAllowed: { type: mongoose.SchemaTypes.Boolean  },
  CGST: { type: mongoose.SchemaTypes.Number },
  SCGST: { type: mongoose.SchemaTypes.Number },
  CESS: { type: mongoose.SchemaTypes.Number },
});

const schema = {
  billNo: { type: mongoose.SchemaTypes.String, required: true },
  salesLoginBy: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" }, //consider as branch
  cashier: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" },
  waiter: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" },
  waiterCode: { type: mongoose.SchemaTypes.String  },
  branch: { type: mongoose.SchemaTypes.ObjectId, ref: "store", required: true },
  items: [itemsSchema],
  totalItems: { type: mongoose.SchemaTypes.Number },
  totalProductCostPrice: { type: mongoose.SchemaTypes.Number },
  totalProductSellingPrice: { type: mongoose.SchemaTypes.Number },
  CGST: { type: mongoose.SchemaTypes.Number },
  SCGST: { type: mongoose.SchemaTypes.Number },
  CESS: { type: mongoose.SchemaTypes.Number },
  discount: { type: mongoose.SchemaTypes.Number },
  discountType: { type: mongoose.SchemaTypes.Number }, //1 -> %, 2 -> Rs
  reduction: { type: mongoose.SchemaTypes.Number },
  roundOffAmt: { type: mongoose.SchemaTypes.Number },
  netAmount: { type: mongoose.SchemaTypes.Number },
  orderDate: { type: Date }, 
  orderBillTime: { type: mongoose.SchemaTypes.String }, 
  orderUpdateDate: { type: Date, default: Date.now },
  paymentType: { type: mongoose.SchemaTypes.Number }, // 1-> cash 2->card 3-> mobile / qr / gpay
  paymentRef: { type: mongoose.SchemaTypes.String }, 
  customerName: { type: mongoose.SchemaTypes.String }, 
  isActive: { type: mongoose.SchemaTypes.Boolean, default: true }, // false -> cancelled
  created_at: { type: Date, default: Date.now },
  cancelled_on: { type: Date },
  cancelled_by: { type: mongoose.SchemaTypes.ObjectId, ref: "employee" },
  cancelReason: { type: mongoose.SchemaTypes.String },
};

const collectionName = "sales";
const SalesSchema = mongoose.Schema(schema);
const Sales = mongoose.model(collectionName, SalesSchema);
module.exports = Sales;
