var express = require("express");
var router = express.Router();
var { check } = require("express-validator");
var multer = require("multer");

//files
var login = require("./login");
var desktopLogin = require("./desktop/login");
var desktopMaster = require("./desktop/masters");
var desktopOrder = require("./desktop/order");

var category = require("./category");
var product = require("./product");
var constants = require("../config/constants");
var utils = require("../utils/helpers");
var storageHelper = require("../utils/storage");
var order = require("./Orders");
var userCollect = require("./users");
var branchOrders = require("./branchOrders");
var stockOrders = require("./StockOrders");
var returnOrders = require("./returnOrders");
const masterCalls = require("./desktop/masters");
const branchStockCalls = require("./BranchStocks");

var fileFilters = function (req, file, cb) {
  // supported image file mimetypes
  var allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
  var fileType = file.mimetype;

  if (allowedMimes.indexOf(fileType.toLowerCase()) >= 0) {
    // allow supported image files
    cb(null, true);
  } else {
    // throw error for invalid files
    cb(new Error("Invalid file type. Only jpg, png image files are allowed."));
  }
};

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/orders");
  },
  filename: function (req, file, cb) {
    cb(null, "order-doc-" + Date.now() + ".jpg");
  },
});

function wrapUpload(multerMiddleware, prefix) {
  return function(req, res, next) {
    multerMiddleware(req, res, function(err) {
      if (err) return next(err);
      storageHelper
        .mirrorMulterRequestToR2(req, prefix)
        .then(function() {
          next();
        })
        .catch(function(uploadErr) {
          console.log("R2 mirror skipped/failed", prefix, uploadErr.message);
          next();
        });
    });
  };
}

var upload = wrapUpload(
  multer({
    storage: storage,
    limits: {
      fileSize: constants.maxImgFileSize,
    },
    fileFilter: fileFilters,
  }).single("image"),
  "blackforest/blackforest-api/orders"
);

// define the home page route
router.get("/", function (req, res) {
  res.send("_/_ :-)");
});

router.get("/categories", utils.validateToken, category.getAll);
router.get(
  "/pastry/categories",
  utils.validateToken,
  category.getAllCategories
);
router.get("/products", utils.validateToken, product.getAllProducts);
router.get(
  "/pastries/:category",
  utils.validateToken,
  product.getAllPastryProducts
);
router.get("/pastry/:id", utils.validateToken, product.getOnePastry);
router.get(
  "/related-pastries/:id",
  utils.validateToken,
  product.getAllRelatedPastries
);
router.get(
  "/products/:id",
  utils.validateToken,
  product.getAllProductsByCategory
);
router.get("/product/:id", utils.validateToken, product.getProductById);
router.get("/albums", utils.validateToken, product.getAllAlbums);
router.get("/product-units", utils.validateToken, product.getAllUnits);
router.get("/addons", utils.validateToken, product.getAllAddons);
router.get("/employees", utils.validateToken, login.getAllEmployees);
router.get(
  "/chefs-and-deliver-man",
  utils.validateToken,
  userCollect.getAllEmployees
);
router.get("/orders", utils.validateToken, order.getAllOrdersByBranch);
router.get("/order/:id", utils.validateToken, order.getOrderById);
router.get("/emporders", utils.validateToken, order.getAllOrdersByEmp);
router.get(
  "/delivery-man-orders",
  utils.validateToken,
  order.getAllOrdersByDeliveryEmp
);
router.get("/today-delivery", utils.validateToken, order.getTodayDeliveryItems);
router.get(
  "/prev-pending-delivery",
  utils.validateToken,
  order.getPendingDeliveryItems
);
router.get(
  "/next-pending-delivery",
  utils.validateToken,
  order.getUpcomingDeliveryItems
);
router.get("/stores", utils.validateToken, order.getAllBranches);
router.get(
  "/all-branch-heads",
  utils.validateToken,
  branchOrders.getAllBranchEmployeeData
);

//branch orders
router.get(
  "/live-branch-order",
  utils.validateToken,
  branchOrders.getAllLiveOrdersList
);
router.get(
  "/one-bill-items/:bill",
  utils.validateToken,
  branchOrders.getOneBill
);
router.post("/update-bill", utils.validateToken, branchOrders.updateBill);
router.post("/confirm-received-item", utils.validateToken, branchOrders.confirmBillReceived);

//stock orders
router.get(
  "/stock-orders-list",
  utils.validateToken,
  stockOrders.getAllStockOrders
);
router.get("/stock-order/:bill", utils.validateToken, stockOrders.getOneBill);
router.post("/stock-order-bill", utils.validateToken, stockOrders.updateBill);
router.post("/confirm-received-stkitem", utils.validateToken, stockOrders.confirmBillReceived);


router.post(
  "/login",
  [
    check("username").isLength({ min: constants.minText }),
    check("password").isLength({ min: constants.minText }),
  ],
  login.makeLogin
);
router.post("/logout", utils.validateToken, login.doLogout);
router.post("/location", utils.validateToken, userCollect.updateLocation);

router.post(
  "/upload/order/:order",
  [utils.validateToken, upload],
  order.fileUpload
);

router.post("/return-items", utils.validateToken, returnOrders.returnOrder);

router.post("/order", order.createOrder);
router.post("/pastry-order", utils.validateToken, order.createPastryOrder);
router.patch("/order/:id", utils.validateToken, order.updateStatus);
router.patch("/order-bal/:id", utils.validateToken, order.updateBalance);
router.patch(
  "/order-chef/:order",
  utils.validateToken,
  order.updatePreparingUser
);
router.patch(
  "/order-delivery/:order",
  utils.validateToken,
  order.updateDeliveryUser
);
router.patch(
  "/order-complete/:order",
  [utils.validateToken],
  order.deliverOrder
);


// Desktop app api's
router.post(
  "/desktop/login",
  [
    check("username").isLength({ min: constants.minText }),
    check("password").isLength({ min: constants.minText }),
  ],
  desktopLogin.makeLogin
);
router.get(
  "/desktop/products",
  utils.validateToken,
  desktopMaster.getAllPastryProducts
);


router.get(
  "/desktop/reports/bill",
  utils.validateToken,
  desktopOrder.reportByBill
);

router.get(
  "/desktop/reports/items",
  utils.validateToken,
  desktopOrder.reportByProduct
);

router.get(
  "/desktop/reports/branch",
  utils.validateToken,
  desktopOrder.reportByBranch
);

router.get(
  "/desktop/reports/time",
  utils.validateToken,
  desktopOrder.reportByTime
);

router.get(
  "/desktop/reports/sales-man",
  utils.validateToken,
  desktopOrder.reportBySalesMan
);

router.get(
  "/desktop/reports/cashier",
  utils.validateToken,
  desktopOrder.reportByCashier
);

router.get(
  "/desktop/reports/groups",
  utils.validateToken,
  desktopOrder.reportByGroup
);

router.post(
  "/desktop/generate-order",
  utils.validateToken,
  desktopOrder.createOrder
);

router.post(
  "/desktop/save-order/:id",
  utils.validateToken,
  desktopOrder.updateOrder
);

router.post(
  "/desktop/cancel-order/:id",
  utils.validateToken,
  desktopOrder.cancelOrder
);

router.post(
  "/desktop/cashier/login",
  utils.validateToken,
  desktopLogin.cashierLogin
);


router.post(
  "/desktop/cashier/logout",
  utils.validateToken,
  desktopLogin.cashierLogout
);

router.get(
  "/desktop/get-sales",
  utils.validateToken,
  desktopOrder.listorders
);

router.get(
  "/desktop/sale/:id",
  utils.validateToken,
  desktopOrder.getOrderById
);

router.get(
  "/desktop/cashiers",
  utils.validateToken,
  masterCalls.getAllCashier
);

router.get(
  "/desktop/sales-man",
  utils.validateToken,
  masterCalls.getAllBranch
);

router.get(
  "/desktop/products-dropdown",
  utils.validateToken,
  masterCalls.getProductsForDropDown
);

router.get(
  "/desktop/waiter-dropdown",
  utils.validateToken,
  masterCalls.getAllWaiter
);
router.get(
  "/pastry-items/enabled-category",
  utils.validateToken,
  branchStockCalls.getAllEnabledCategory
);

router.get(
  "/pastry-items/enabled-products",
  utils.validateToken,
  branchStockCalls.getAllEnabledProducts
);



module.exports = router;

