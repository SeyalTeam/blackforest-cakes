const mongoose = require("../config/database");

const schema = {
    branch: { type: mongoose.SchemaTypes.ObjectId, ref: "store" },
    isEnable: { type: mongoose.SchemaTypes.Boolean, default: true },
    qty: { type: mongoose.SchemaTypes.String },
    category: { type: mongoose.SchemaTypes.ObjectId, ref: 'productcategory', required: true },
    product: { type: mongoose.SchemaTypes.ObjectId, ref: "pastry", required: true },
};

const collectionName = "stocks_branch_products";

const stkProSchema = mongoose.Schema(schema, {
    timestamps: true
});

const stkPro = mongoose.model(collectionName, stkProSchema);

module.exports = stkPro;