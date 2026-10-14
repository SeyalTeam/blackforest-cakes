var config = require("../config/config");
var Store = null;
try {
  Store = require("../models/StoreModel");
} catch (e) {}

function getBaseUrl() {
  var url = config.payloadApiUrl || "http://127.0.0.1:4000";
  return url.replace(/\/+$/, "");
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-app-secret": process.env.BLACKFOREST_APP_SECRET || "bf_sec_2026_k9x2m8q4v7",
  };
}

function mapOrderStatus(statusNum) {
  var num = parseInt(statusNum, 10);
  switch (num) {
    case 1:
      return "pending";
    case 2:
      return "cancelled";
    case 3:
      return "delivered";
    case 4:
      return "prepared";
    case 5:
      return "ready";
    case 6:
      return "picked";
    case 7:
      return "delivered";
    case 8:
      return "pending";
    default:
      return "pending";
  }
}

function safeFetch(url, options) {
  if (typeof fetch === "function") {
    return fetch(url, options);
  }
  return Promise.resolve(null);
}

function postToSyncEndpoint(payloadBody) {
  var targetUrl = getBaseUrl() + "/api/cakes/sync";
  return safeFetch(targetUrl, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payloadBody),
  })
    .then(function (res) {
      if (!res) return;
      if (res.ok) {
        console.log(
          "[PayloadSync] Successfully synced to Payload:",
          payloadBody.action || "create",
          payloadBody.kotNumber || payloadBody.legacyOrderId
        );
      } else {
        res.text().then(function (text) {
          console.log(
            "[PayloadSync] Payload order sync returned non-200:",
            res.status,
            text
          );
        });
      }
    })
    .catch(function (err) {
      console.log(
        "[PayloadSync] Error communicating with Payload (non-blocking):",
        err.message
      );
    });
}

var payloadSync = {
  syncNewOrder: function (result, rawBody) {
    rawBody = rawBody || {};
    try {
      var cakePrice =
        parseFloat(result.amount) || parseFloat(rawBody.amount) || 0;
      var paymentAmount =
        parseFloat(result.advance) || parseFloat(rawBody.advance) || 0;
      var pendingAmount =
        parseFloat(result.balance) ||
        Math.max(0, cakePrice - paymentAmount);
      var paymentType = pendingAmount <= 0 ? "full" : "advance";
      var paymentStatus = pendingAmount <= 0 ? "paid" : "pending";

      var sendOrder = function (branchName) {
        var payloadBody = {
          action: "create",
          kotNumber: String(result.form_no || rawBody.form_no || Date.now()),
          legacyOrderId: String(result._id),
          branch: result.branch ? String(result.branch) : undefined,
          branchName: branchName || rawBody.branch_name || result.branch_name || undefined,
          customerName: result.customer_name || rawBody.customer_name || "",
          customerPhone: result.customer_phone || rawBody.customer_phone || "",
          customerEmail: result.customer_email || rawBody.customer_email || "",
          deliveryAddress: result.address || rawBody.address || "",
          cakePrice: cakePrice,
          paymentAmount: paymentAmount,
          pendingAmount: pendingAmount,
          paymentMethod: "cash",
          paymentType: paymentType,
          status: paymentStatus,
          orderStatus: mapOrderStatus(result.status || rawBody.status || 1),
          deliveryDate: result.delivery_date
            ? new Date(result.delivery_date).toISOString()
            : new Date().toISOString(),
          flavour: result.flavour || rawBody.flavour || "",
          weight: result.weight || rawBody.weight || "",
          creamType: result.type || rawBody.type || "",
          cakeModel: result.cake_model || rawBody.cake_model || "",
          alteration: result.alteration || rawBody.alteration || "",
          wordings: result.wordings || rawBody.wordings || "",
          specialCare: result.special_care || rawBody.special_care || "",
          deliveryType:
            String(result.delivery_type || rawBody.delivery_type) === "1"
              ? "home"
              : "shop",
          orderDoc: result.order_doc || rawBody.order_doc || "",
          cashierId: result.sales_man ? String(result.sales_man) : undefined,
        };

        postToSyncEndpoint(payloadBody);
      };

      if (result.branch && Store) {
        Store.findById(result.branch, function (err, storeDoc) {
          var branchName = storeDoc ? storeDoc.branch : undefined;
          sendOrder(branchName);
        });
      } else {
        sendOrder(rawBody.branch_name);
      }
    } catch (e) {
      console.log(
        "[PayloadSync] Unexpected exception in syncNewOrder (non-blocking):",
        e.message
      );
    }
  },

  syncOrderStatus: function (legacyOrderId, statusNum) {
    if (!legacyOrderId) return;
    try {
      postToSyncEndpoint({
        action: "update-status",
        legacyOrderId: String(legacyOrderId),
        orderStatus: mapOrderStatus(statusNum),
      });
    } catch (e) {
      console.log(
        "[PayloadSync] Unexpected exception in syncOrderStatus:",
        e.message
      );
    }
  },

  syncOrderBalance: function (legacyOrderId, advance, balance) {
    if (!legacyOrderId) return;
    try {
      var paid = parseFloat(advance) || 0;
      var pending = parseFloat(balance) || 0;
      postToSyncEndpoint({
        action: "update-balance",
        legacyOrderId: String(legacyOrderId),
        paymentAmount: paid,
        pendingAmount: pending,
        status: pending <= 0 ? "paid" : "pending",
      });
    } catch (e) {
      console.log(
        "[PayloadSync] Unexpected exception in syncOrderBalance:",
        e.message
      );
    }
  },

  syncOrderDocument: function (legacyOrderId, filename) {
    if (!legacyOrderId || !filename) return;
    try {
      postToSyncEndpoint({
        action: "update-document",
        legacyOrderId: String(legacyOrderId),
        orderDoc: String(filename),
      });
    } catch (e) {
      console.log(
        "[PayloadSync] Unexpected exception in syncOrderDocument:",
        e.message
      );
    }
  },
};

module.exports = payloadSync;
