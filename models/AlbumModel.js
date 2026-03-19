const mongoose = require("../config/database");

const schema = {
  name: { type: mongoose.SchemaTypes.String, required: true },
  created_at: { type: Date, default: Date.now },
  isActive: { type: mongoose.SchemaTypes.Boolean, default: true },
};

const collectionName = "albums";
const albumSchema = mongoose.Schema(schema);

albumSchema.pre("save", function (next) {
  var self = this;
  Album.find({ name: self.name }, function (err, docs) {
    if (!docs.length) {
      next();
    } else {
      next(new Error("Album already exists!"));
    }
  });
});

const Album = mongoose.model(collectionName, albumSchema);

module.exports = Album;
