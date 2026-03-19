const mongoose = require("../config/database");

const schema = {
    name: { type: mongoose.SchemaTypes.String, required: true },
    email: { type: mongoose.SchemaTypes.String, unique: true, required: true },
    password: { 
        type: mongoose.SchemaTypes.String, 
        required: true
    },
    created_at : { type : Date, default: Date.now }
};

const collectionName = "admin"; 
const adminSchema = mongoose.Schema(schema);

adminSchema.pre('save', function (next) {
    var self = this;
    Admin.find({email : self.email}, function (err, docs) {
        if (!docs.length){
            next();
        } else{                
            next(new Error("User exists!"));
        }
    });
});

const Admin = mongoose.model(collectionName, adminSchema);

module.exports = Admin;