var Express = require("express");
var App = Express();
var config = require("./config/config");
var NotificationCall = require("./utils/notification");
var CronJob = require("cron").CronJob;

// every 10 sec
var job = new CronJob("*/10 * * * * *", function () {
  NotificationCall.sendOneHourBeforeNotificationsToAll();
});

// every minute
var job2 = new CronJob("1 * * * * *", function () {
  NotificationCall.sendNotificationsToAll();
});

// early morning 1 am
var job3 = new CronJob("0 0 1 * * *", function () {
  NotificationCall.sendEveryDayNotification();
  NotificationCall.updateBillStatusEveryDay(); // close bill every night
});

// every month
var job4 = new CronJob("0 0 0 1 * *", function () {
  NotificationCall.deleteOrderDocumentEveryMonth();
});

job.start();
job2.start();
job3.start();
job4.start();

App.listen(config.cronPort, () =>
  console.log(`App listening on port ${config.cronPort}!`)
);
