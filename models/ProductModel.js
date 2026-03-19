const mongoose = require("../config/database");
const fs = require('fs-extra');


var priceSchema = new mongoose.Schema({
    price: { type: mongoose.SchemaTypes.String, required: true }, //mrp
    // sellingPrice: { type: mongoose.SchemaTypes.String, required: true },
    // costPrice: { type: mongoose.SchemaTypes.String, required: true },
    qty: { type: mongoose.SchemaTypes.String, required: true },
    offerPercent: { type: mongoose.SchemaTypes.String },
    unit: { type: mongoose.SchemaTypes.String },
    type: { type: mongoose.SchemaTypes.Number }, //1 => fresh cream , 2 => butter cream
});

const schema = {
    name: { type: mongoose.SchemaTypes.String, required: true },
    category: { type: mongoose.SchemaTypes.ObjectId, ref: 'productcategory', required: true },
    album: { type: mongoose.SchemaTypes.ObjectId, ref: 'albums', required: true },
    description: { type: mongoose.SchemaTypes.String },
    directuse: { type: mongoose.SchemaTypes.String },
    footnote: { type: mongoose.SchemaTypes.String },
    ingredients: { type: mongoose.SchemaTypes.String },
    display_order: { type: mongoose.SchemaTypes.Number },
    image: [{ type: mongoose.SchemaTypes.String }],
    price: [priceSchema],
    isActive: {type: mongoose.SchemaTypes.Boolean, default: 'true'},
    created_at : { type : Date, default: Date.now }
};

const collectionName = "product"; 
const productSchema = mongoose.Schema(schema);

productSchema.pre('save', function (next) {
    var self = this;
    
    Product.find({name : self.name, category: self.category}, function (err, docs) {
        if (!docs.length){
            next();
        } else{    
            if(self.image && (self.image).length > 0){
                self.image.forEach(img => {
                    const path = './uploads/'  + img;
                    fs.remove(path, (err) => {
                        if(err) return console.log(err);
                    })
                });
            }
                    
            next(new Error("Product already exists for this category!"));
        }
    });
});

const Product = mongoose.model(collectionName, productSchema);

module.exports = Product;