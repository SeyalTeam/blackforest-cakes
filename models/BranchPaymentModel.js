const mongoose = require("../config/database");

const schema = {
    year: { type: mongoose.SchemaTypes.String },
    month: { type: mongoose.SchemaTypes.String },
    branch: { type: mongoose.SchemaTypes.ObjectId, ref: 'employee' },
    totalcost: { type: mongoose.SchemaTypes.String },
    balanceAmount: { type: mongoose.SchemaTypes.String },
    created_at : { type : Date, default: Date.now }
};

const collectionName = "branch_payments"; 
const branchPaymentSchema = mongoose.Schema(schema);

const BranchPayment = mongoose.model(collectionName, branchPaymentSchema);

module.exports = BranchPayment;