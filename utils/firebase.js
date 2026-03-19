var admin = require("firebase-admin");
var serviceAccount = require("../env/firebase_env.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://bloackforestcakes.firebaseio.com"
});

module.exports = admin;