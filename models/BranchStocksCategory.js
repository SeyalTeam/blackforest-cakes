const mongoose = require("../config/database");

const schema = {
    branch: { type: mongoose.SchemaTypes.ObjectId, ref: "store" },
    category: { type: mongoose.SchemaTypes.ObjectId, ref: 'productcategory', required: true },
    isEnable: { type: mongoose.SchemaTypes.Boolean, default: true },
};

const collectionName = "stocks_branch_categories";

const stkCatSchema = mongoose.Schema(schema, {
    timestamps: true
});

const stkCat = mongoose.model(collectionName, stkCatSchema);

module.exports = stkCat;