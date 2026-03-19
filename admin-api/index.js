var express = require("express");
var router = express.Router();
var multer = require("multer");

//files
var admin = require("./admin");
var store = require("./store");
var employee = require("./employee");
var productCategory = require("./product-category");
var addons = require("./addons");
var albums = require("./album");
var orders = require("./order");
var branchOrders = require("./branch-orders");
var stockOrders = require("./stock-orders");
var productUnits = require("./product-units");
var products = require("./product");
var dashboard = require("./dashboard");
var exportFile = require("./export");
var pastry = require("./pastry");
var payments = require("./payments");
var reports = require("./reports");
var returnOrders = require("./order-return");
var salesOrders = require("./sales");
var branchStocks = require("./branch-stocks");

var utils = require("../utils/helpers");
var constants = require("../config/constants");
var helpers = require("../utils/helpers");
var storageHelper = require("../utils/storage");

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
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      "bkpic-" + Date.now() + "." + helpers.getFileExt(file.originalname)
    );
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

var multipleUpload = wrapUpload(
  multer({
    storage: storage,
    limits: {
      fileSize: constants.maxImgFileSize,
    },
    fileFilter: fileFilters,
  }).array("image"),
  "blackforest/blackforest-api/general"
);

var upload = wrapUpload(
  multer({
    storage: storage,
    limits: {
      fileSize: constants.maxImgFileSize,
    },
    fileFilter: fileFilters,
  }).single("image"),
  "blackforest/blackforest-api/general"
);

var { check } = require("express-validator");

/**
 * general routes
 * */

router.get("/", function (req, res) {
  res.send("Admin API");
});
router.post("/create", admin.createAdmin);
router.post("/login", admin.makeLogin);

/**
 * auth routes
 * */

//get routes
router.get("/allstore", utils.validateToken, employee.getAllStoreData);
router.get("/allalbum", utils.validateToken, products.getAlbumCollection);
router.get("/allcategory", utils.validateToken, products.getCategory);
router.get(
  "/allPastryCategory",
  utils.validateToken,
  products.getCategoryPastry
);

router.get("/store", utils.validateToken, store.getAll);
router.get("/store/:id", utils.validateToken, store.getOneStore);
router.get("/employee", utils.validateToken, employee.getAll);
router.get(
  "/branch-employee",
  utils.validateToken,
  employee.getAllBranchEmployeeData
);
router.get(
  "/delivery-chefs",
  utils.validateToken,
  employee.getEmployeesByChefsAndDeliveryBoy
);
router.get("/employee/:id", utils.validateToken, employee.getOne);
router.get("/product-category", utils.validateToken, productCategory.getAll);
router.get(
  "/product-category/:id",
  utils.validateToken,
  productCategory.getOne
);
router.get("/addons", utils.validateToken, addons.getAll);
router.get("/addons/:id", utils.validateToken, addons.getOne);
router.get("/albums", utils.validateToken, albums.getAll);
router.get("/albums/:id", utils.validateToken, albums.getOne);
router.get("/product-unit", utils.validateToken, productUnits.getAll);
router.get("/product-unit-list", utils.validateToken, productUnits.getAllUnits);
router.get("/product-unit/:id", utils.validateToken, productUnits.getOne);
router.get("/product", utils.validateToken, products.getAll);
router.get(
  "/product-by-categories",
  utils.validateToken,
  products.getAllProductsByCategories
);
router.get(
  "/pastry-product-by-categories",
  utils.validateToken,
  pastry.getAllProductsByCategories
);
router.get("/product/:id", utils.validateToken, products.getOne);
router.get("/orders", utils.validateToken, orders.getAllOrders);
router.get("/chef-orders/:chef", utils.validateToken, orders.getAllOrdersByChef);
router.get("/print-orders", utils.validateToken, orders.getAllOrdersForPrint);
router.get("/pastry-orders", utils.validateToken, orders.getAllPastryOrders);
router.get("/notifications", utils.validateToken, orders.getAllNotifications);
router.get("/order/:order", utils.validateToken, orders.getOrderById);
router.get(
  "/pastry-order/:order",
  utils.validateToken,
  orders.getPastryOrderById
);
router.get("/getAllBranchList", utils.validateToken, orders.getAllBranch);
router.get("/get-branch-count", utils.validateToken, dashboard.getAllBranch);
router.get("/get-emp-count", utils.validateToken, dashboard.getAllEmployees);
router.get("/get-order-count", utils.validateToken, dashboard.getAllOrders);
router.get(
  "/get-order-pending",
  utils.validateToken,
  dashboard.getAllOrdersPending
);
router.get(
  "/get-dashboard-chart",
  utils.validateToken,
  dashboard.getAllOrdersByMonth
);
router.get("/download-report", utils.validateToken, exportFile.downloadExcel);
router.get(
  "/download-pastry-report",
  utils.validateToken,
  exportFile.downloadPastryExcel
);
router.get("/pastries", utils.validateToken, pastry.getAll);
router.get("/pastry/:id", utils.validateToken, pastry.getOne);
router.get("/all-employees", utils.validateToken, employee.getAllEmployees);
router.get(
  "/today-delivery-items",
  utils.validateToken,
  orders.getTodayDeliveryItems
);
router.get(
  "/tracking/:order",
  utils.validateToken,
  orders.getOrderTrackingRecord
);

//branchOrders
router.get(
  "/live-order-bills/:branch",
  utils.validateToken,
  branchOrders.getAllBillOrdersByBranch
);
router.get("/bills-order", utils.validateToken, branchOrders.getBillRecords);
router.get(
  "/download-bill-report",
  utils.validateToken,
  branchOrders.downloadPastryExcel
);
router.get("/bills-order/:bill", utils.validateToken, branchOrders.getOneBill);
router.get(
  "/return-orders",
  utils.validateToken,
  returnOrders.getAllReturnOrders
);
router.get(
  "/print-return-orders",
  utils.validateToken,
  returnOrders.printOrders
);

router.get(
  "/print-allbranch-orders",
  utils.validateToken,
  branchOrders.printBranchOrders
);

router.get(
  "/print-allstock-orders",
  utils.validateToken,
  stockOrders.printStockOrders
);

router.get(
  "/report-by-products",
  utils.validateToken,
  reports.getAllProductReport
);

router.get(
  "/report-by-allorders",
  utils.validateToken,
  reports.getAllOrderReport
);
router.post(
  "/remove-one-branch-item",
  utils.validateToken,
  branchOrders.removeOneItem
);
router.post(
  "/remove-one-stock-item",
  utils.validateToken,
  stockOrders.removeOneItem
);
router.post("/update-pastry-item", utils.validateToken, branchOrders.updateQty);
router.post("/close-bill", utils.validateToken, branchOrders.closeBill);
router.post(
  "/pastry-payment/:bill",
  utils.validateToken,
  branchOrders.updateBalancePayment
);

//stockOrders
router.get(
  "/stock-bills-order",
  utils.validateToken,
  stockOrders.getBillRecords
);
router.get(
  "/download-stock-bill-report",
  utils.validateToken,
  stockOrders.downloadPastryExcel
);
router.get(
  "/stock-bills-order/:bill",
  utils.validateToken,
  stockOrders.getOneBill
);
router.post("/update-stock-item", utils.validateToken, stockOrders.updateQty);
router.post(
  "/stock-payment/:bill",
  utils.validateToken,
  stockOrders.updateBalancePayment
);

//branch and stock payments
router.get(
  "/payments",
  utils.validateToken,
  payments.getYearlyPaymentInfoByBranch
);
router.post("/pay-amount", utils.validateToken, payments.payBalanceAmount);

// router.post('/bulk-pro-update', products.addDisplayOrder);

//post routes
router.post("/force-logout/:emp", utils.validateToken, employee.forceLogout);

router.post("/order/:order", utils.validateToken, orders.updateStatus);
router.post(
  "/order-prepare-user/:order",
  utils.validateToken,
  orders.updatePreparingUser
);
router.post(
  "/order-deliver-user/:order",
  utils.validateToken,
  orders.updateDeliveryUser
);
router.post("/order-balance/:order", utils.validateToken, orders.updateBalance);
router.post("/notification/:id", utils.validateToken, orders.viewNotification);
router.post(
  "/pastry-order/:order",
  utils.validateToken,
  orders.updatePastryAvailQty
);

router.post("/get-sales-man-report", utils.validateToken, orders.getSalesManReport);
router.post("/get-chefs-report", utils.validateToken, orders.getChefsReport);

router.post("/changePassword", [utils.validateToken], admin.changePassword);

router.post(
  "/store",
  [
    utils.validateToken,
    upload,
    check("branch").isLength({ min: constants.minText }),
    check("address").isLength({ min: constants.minText }),
  ],
  store.createStore
);

router.post(
  "/employee",
  [
    utils.validateToken,
    upload,
    check("firstname").isLength({ min: constants.minText }),
    // check('email').isEmail(),
    // check('phone').isLength({min: constants.minPhone}),
    // check('address').isLength({min: constants.minText}),
    check("username").isLength({ min: constants.minText }),
    check("password").isLength({ min: constants.minText }),
  ],
  employee.create
);

router.post(
  "/product-category",
  [
    utils.validateToken,
    upload,
    check("name").isLength({ min: constants.minText }),
  ],
  productCategory.create
);

router.post(
  "/addons",
  [
    utils.validateToken,
    upload,
    check("name").isLength({ min: constants.minText }),
  ],
  addons.create
);

router.post(
  "/albums",
  [utils.validateToken, check("name").isLength({ min: constants.minText })],
  albums.create
);

router.post(
  "/pastry",
  [
    utils.validateToken,
    upload,
    check("name").isLength({ min: constants.minText }),
  ],
  pastry.create
);

router.post(
  "/product-unit",
  [utils.validateToken, check("name").isLength({ min: constants.minText })],
  productUnits.create
);

router.post(
  "/product",
  [
    utils.validateToken,
    multipleUpload,
    check("name").isLength({ min: constants.minText }),
    // check('description').isLength({min: constants.minText}),
    // check('directuse').isLength({min: constants.minText}),
    // check('footnote').isLength({min: constants.minText}),
    // check('ingredients').isLength({min: constants.minText}),
    check("price.*.price").not().isEmpty(),
    // check("price.*.isOffer").not().isEmpty(),
    check("price.*.qty").not().isEmpty(),
    // check("price.*.offerPercent").not().isEmpty()
  ],
  products.create
);

router.post(
  "/product-img/:id",
  [utils.validateToken, upload],
  products.addProductImage
);

//update routes
router.put(
  "/store/:id",
  [
    utils.validateToken,
    upload,
    check("branch").isLength({ min: constants.minText }),
    check("address").isLength({ min: constants.minText }),
  ],
  store.updateStore
);

router.put(
  "/employee/:id",
  [
    utils.validateToken,
    upload,
    check("firstname").isLength({ min: constants.minText }),
    check("phone").isLength({ min: constants.minPhone }),
    check("address").isLength({ min: constants.minText }),
  ],
  employee.updateEmployees
);

router.put(
  "/product-category/:id",
  [
    utils.validateToken,
    upload,
    check("name").isLength({ min: constants.minText }),
  ],
  productCategory.update
);

router.put(
  "/addons/:id",
  [
    utils.validateToken,
    upload,
    check("name").isLength({ min: constants.minText }),
  ],
  addons.update
);

router.put(
  "/albums/:id",
  [utils.validateToken, check("name").isLength({ min: constants.minText })],
  albums.update
);

router.put(
  "/pastry/:id",
  [
    utils.validateToken,
    upload,
    check("name").isLength({ min: constants.minText }),
  ],
  pastry.update
);

router.put(
  "/product-unit/:id",
  [utils.validateToken, check("name").isLength({ min: constants.minText })],
  productUnits.update
);

router.put(
  "/product/:id",
  [
    utils.validateToken,
    check("name").isLength({ min: constants.minText }),
    // check('description').isLength({min: constants.minText}),
    // check('directuse').isLength({min: constants.minText}),
    // check('footnote').isLength({min: constants.minText}),
    // check('ingredients').isLength({min: constants.minText}),
    check("price.*.price").not().isEmpty(),
    // check("price.*.isOffer").not().isEmpty(),
    check("price.*.qty").not().isEmpty(),
    // check("price.*.offerPercent").not().isEmpty()
  ],
  products.update
);

router.post(
  "/return-orders/:id",
  utils.validateToken,
  returnOrders.confirmReturn
);

//salesOrders
router.post(
  "/get-sales-orders",
  utils.validateToken,
  salesOrders.listorders
);
router.get(
  "/get-cashiers",
  utils.validateToken,
  salesOrders.getAllCashier
);
router.get(
  "/get-terminals",
  utils.validateToken,
  salesOrders.getAllTerminalMan
);
router.get(
  "/get-managers",
  utils.validateToken,
  salesOrders.getAllManagers
);

router.get(
  "/get-salesman",
  utils.validateToken,
  salesOrders.getAllWaiter
);

router.get(
  "/get-chef-emp",
  utils.validateToken,
  salesOrders.getAllChefs
);


router.get(
  "/get-branch-stock-category",
  utils.validateToken,
  branchStocks.getAllBranchCategory
);


router.get(
  "/get-branch-stock-products",
  utils.validateToken,
  branchStocks.getAllBranchProducts
);



router.post(
  "/report-category",
  utils.validateToken,
  salesOrders.reportByGroup
);


router.post(
  "/report-sales-man",
  utils.validateToken,
  salesOrders.reportBySalesMan
);


router.post(
  "/report-cashier",
  utils.validateToken,
  salesOrders.reportByCashier
);

router.post(
  "/report-terminal",
  utils.validateToken,
  salesOrders.reportByBranch
);

router.post(
  "/report-bill-wise",
  utils.validateToken,
  salesOrders.reportByBill
);
router.post(
  "/report-time-wise",
  utils.validateToken,
  salesOrders.reportByTime
);
router.post(
  "/report-manager-wise",
  utils.validateToken,
  salesOrders.reportByManager
);
// End sales report


router.post(
  "/product-dropdown",
  utils.validateToken,
  salesOrders.getProductsForDropDown
);


router.post(
  "/create-branch-category",
  utils.validateToken,
  branchStocks.createBranchCategoryAndProducts
);

router.post(
  "/disable-branch-category",
  utils.validateToken,
  branchStocks.disableCategory
);

router.post(
  "/product-stock-update",
  utils.validateToken,
  branchStocks.updateProStock
);

router.post(
  "/report-product",
  utils.validateToken,
  salesOrders.reportByProduct
);

//delete routes
router.delete("/store/:id", utils.validateToken, store.deleteStoreById);
router.delete("/employee/:id", utils.validateToken, employee.deleteEmployee);
router.delete("/addons/:id", utils.validateToken, addons.deleteAddonsById);
router.delete("/pastry/:id", utils.validateToken, pastry.deletePastryById);
router.delete(
  "/product-category/:id",
  utils.validateToken,
  productCategory.deleteCateById
);
router.delete("/albums/:id", utils.validateToken, albums.deleteAlbumById);
router.delete(
  "/product-unit/:id",
  utils.validateToken,
  productUnits.deleteAlbumById
);
router.delete(
  "/product-img/:id",
  [utils.validateToken, check("name").not().isEmpty()],
  products.removeProductImage
);
router.delete("/order/:order", utils.validateToken, orders.deleteOrder);
router.delete(
  "/pastry-order/:order",
  utils.validateToken,
  orders.deletePastryOrder
);
router.delete(
  "/product-activate/:id",
  utils.validateToken,
  products.activateProduct
);
router.delete("/product/:id", utils.validateToken, products.deactivateProduct);
// router.delete("/product/:id", utils.validateToken, products.deactivateProduct);

module.exports = router;
