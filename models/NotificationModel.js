const mongoose = require("../config/database");

const schema = {
    title: { type: mongoose.SchemaTypes.String },
    order_id: { type: mongoose.SchemaTypes.ObjectId, ref: 'order' },
    is_viewed: { type: mongoose.SchemaTypes.Boolean, default: false },
    isPastry: { type: mongoose.SchemaTypes.Boolean, default: false },
    created_at : { type : Date, default: Date.now }
};

const collectionName = "notifications"; 
const notificationSchema = mongoose.Schema(schema);

const Notification = mongoose.model(collectionName, notificationSchema);

module.exports = Notification;