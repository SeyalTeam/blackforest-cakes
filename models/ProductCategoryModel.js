const mongoose = require("../config/database");
const fs = require('fs-extra');

const schema = {
    name: { type: mongoose.SchemaTypes.String, required: true },
    parentId: { type: mongoose.SchemaTypes.ObjectId, ref: 'productcategory' },
    image: { type: mongoose.SchemaTypes.String },
    isPastryProduct: { type: mongoose.SchemaTypes.Boolean, default: false},
    created_at : { type : Date, default: Date.now }
};

const collectionName = "productcategory"; 
const proCatSchema = mongoose.Schema(schema);

proCatSchema.pre('save', function (next) {
    var self = this;
    ProCat.find({name : self.name}, function (err, docs) {
        if (!docs.length){
            next();
        } else{    
            if(self.image){
                const path = './uploads/'  + self.image;
                fs.remove(path, (err) => {
                    if(err) return console.log(err);
    
                })
            }            
            next(new Error("Category already exists!"));
        }
    });
});

const ProCat = mongoose.model(collectionName, proCatSchema);

module.exports = ProCat;