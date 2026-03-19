const mongoose = require("../config/database");
const fs = require('fs-extra');

const schema = {
    name: { type: mongoose.SchemaTypes.String, required: true },
    price: { type: mongoose.SchemaTypes.String, required: true  },
    image: { type: mongoose.SchemaTypes.String },
    created_at : { type : Date, default: Date.now }
};

const collectionName = "addons"; 
const addonSchema = mongoose.Schema(schema);

addonSchema.pre('save', function (next) {
    var self = this;    
    Addon.find({name : self.name}, function (err, docs) {
        if (!docs.length){
            next();
        } else{    
            if(self.image){
                const path = './uploads/'  + self.image;
                fs.remove(path, (err) => {
                    if(err) return console.log(err);
    
                })
            }            
            next(new Error("addons already exists!"));
        }
    });
});

const Addon = mongoose.model(collectionName, addonSchema);

module.exports = Addon;