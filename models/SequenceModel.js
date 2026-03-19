const mongoose = require("../config/database");

const schema = {
    created_at: { type: Date, default: Date.now },
    branch: { type: mongoose.SchemaTypes.ObjectId, ref: "store", required: true },
    sequence: { type: mongoose.SchemaTypes.Number },
};

const collectionName = "order_bill_sequence";

const sequenceSchema = mongoose.Schema(schema);

const SequenceSchemaModel = mongoose.model(collectionName, sequenceSchema);

module.exports = SequenceSchemaModel;