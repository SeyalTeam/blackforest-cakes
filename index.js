var Express = require('express');
var App = Express();
var helmet = require('helmet');
var cors = require('cors');
var BodyParser = require('body-parser');
var fs = require('fs');

var apiV1 = require('./api/index');
var adminV1 = require('./admin-api/index');
var runtimePaths = require('./utils/runtime-paths');
var storageHelper = require('./utils/storage');

function redirectToR2(res, key) {
  var url = storageHelper.buildPublicUrl(key);
  if (!url) {
    return res.status(404).json({ message: 'Static asset storage is not configured' });
  }

  return res.redirect(url);
}

function serveDocument(req, res) {
  var filePath = runtimePaths.getDocumentFilePath(req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Document not found' });
  }

  return res.sendFile(filePath);
}

function serveGeneralImage(req, res, next) {
  if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(req.params.name || '')) {
    return next();
  }

  return redirectToR2(res, 'blackforest/blackforest-api/general/' + req.params.name);
}

App.use(cors());
App.use(helmet());
App.use(BodyParser.urlencoded({ extended: true }));
App.use(BodyParser.json());

App.use('/api/v1', apiV1);
App.use('/admin/v1', adminV1);
App.use('/v1/api/v1', apiV1);
App.use('/v1/admin/v1', adminV1);

App.get('/v1/orders/:name', function(req, res) {
  return redirectToR2(res, 'blackforest/blackforest-api/orders/' + req.params.name);
});

App.get('/orders/:name', function(req, res) {
  return redirectToR2(res, 'blackforest/blackforest-api/orders/' + req.params.name);
});

App.get('/v1/documents/:name', serveDocument);
App.get('/documents/:name', serveDocument);
App.get('/v1/:name', serveGeneralImage);
App.get('/:name', serveGeneralImage);

App.get('/', function(req, res) {
  res.json({
    message: 'blackforest-api vercel backend',
    routes: ['/api/v1', '/admin/v1', '/v1/api/v1', '/v1/admin/v1']
  });
});

App.use(function(err, req, res, next) {
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).json({ message: err.message });
});

module.exports = App;
