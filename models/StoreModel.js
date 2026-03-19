const mongoose = require("../config/database");
const fs = require('fs-extra');


const schema = {
    branch: { type: mongoose.SchemaTypes.String, required: true },
    address: { type: mongoose.SchemaTypes.String, required: true },
    phone: { type: mongoose.SchemaTypes.Number, required: true },
    image: { type: mongoose.SchemaTypes.String },
    created_at : { type : Date, default: Date.now }
};

const collectionName = "store"; 
const storeSchema = mongoose.Schema(schema);

storeSchema.pre('save', function (next) {
    var self = this;
    var self = this;
    Store.find({branch : self.branch}, function (err, docs) {
        if (!docs.length){
            next();
        } else{ 
            
        if(self.image){
            const path = './uploads/'  + self.image;
            fs.remove(path, (err) => {
                if(err) return console.log(err);

            })
        }              
            next(new Error("Branch exists!"));
        }
    });
});

const Store = mongoose.model(collectionName, storeSchema);

module.exports = Store;