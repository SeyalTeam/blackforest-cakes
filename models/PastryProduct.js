const mongoose = require("../config/database");
const fs = require('fs-extra');

const schema = {
    name: { type: mongoose.SchemaTypes.String, required: true },
    price: { type: mongoose.SchemaTypes.String, required: true },
    image: { type: mongoose.SchemaTypes.String },
    code: { type: mongoose.SchemaTypes.String },
    cgst: { type: mongoose.SchemaTypes.Number },
    sgst: { type: mongoose.SchemaTypes.Number },
    cess: { type: mongoose.SchemaTypes.Number },
    allowGST: { type: mongoose.SchemaTypes.Boolean },
    unit: { type: mongoose.SchemaTypes.ObjectId, ref: 'productunit' },
    category: { type: mongoose.SchemaTypes.ObjectId, ref: 'productcategory' },
    created_at: { type: Date, default: Date.now },
    isActive: { type: mongoose.SchemaTypes.Boolean, default: 'true' },
};

const collectionName = "pastry";
const pastrySchema = mongoose.Schema(schema);

pastrySchema.pre('save', function (next) {
    var self = this;
    Pastry.find({ name: self.name }, function (err, docs) {
        if (!docs.length) {
            next();
        } else {
            if (self.image) {
                const path = './uploads/' + self.image;
                fs.remove(path, (err) => {
                    if (err) return console.log(err);

                })
            }
            next(new Error("Pastry product already exists!"));
        }
    });
});

const Pastry = mongoose.model(collectionName, pastrySchema);

module.exports = Pastry;