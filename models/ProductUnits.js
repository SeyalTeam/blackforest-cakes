const mongoose = require("../config/database");

const schema = {
    name: { type: mongoose.SchemaTypes.String, required: true },
    created_at : { type : Date, default: Date.now }
};

const collectionName = "productunits"; 
const unitSchema = mongoose.Schema(schema);

unitSchema.pre('save', function (next) {
    var self = this;
    ProductUnit.find({name : self.name}, function (err, docs) {
        if (!docs.length){
            next();
        } else{     
            next(new Error("Product unit already exists!"));
        }
    });
});

const ProductUnit = mongoose.model(collectionName, unitSchema);

module.exports = ProductUnit;