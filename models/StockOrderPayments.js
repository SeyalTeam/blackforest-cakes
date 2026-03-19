const mongoose = require("../config/database");

const schema = {
    created_at: { type: Date, default: Date.now },
    price:{ type: mongoose.SchemaTypes.Number }, 
    balance:{ type: mongoose.SchemaTypes.Number }, 
    invoiceBreakUp: [{
        created_at: { type: Date, default: Date.now },
        paid: { type: mongoose.SchemaTypes.Number }
    }],
    status: { type: mongoose.SchemaTypes.String }, //1 > pending 2>completed 
    bill_no: { type: mongoose.SchemaTypes.String, required: true, ref: 'stockorder'},
};

const collectionName = "stock_order_payment";

const orderSchema = mongoose.Schema(schema);

const stockOrderPayment = mongoose.model(collectionName, orderSchema);

module.exports = stockOrderPayment;