var fs = require('fs');
var path = require('path');
var AWS = require('aws-sdk');

var client = null;

function trimTrailingSlash(value) {
  return (value || '').replace(/\/+$/, '');
}

function isConfigured() {
  return !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET
  );
}

function getClient() {
  if (!client) {
    client = new AWS.S3({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
      region: process.env.S3_REGION || 'auto',
      httpOptions: { timeout: 300000 }
    });
  }
  return client;
}

function contentTypeFor(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function uploadLocalFile(localPath, key) {
  if (!isConfigured()) {
    return Promise.resolve({ skipped: true, reason: 'missing_config', key: key });
  }

  return getClient().upload({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentType: contentTypeFor(localPath)
  }).promise();
}

function listMulterFiles(req) {
  var files = [];
  if (req.file) files.push(req.file);

  if (Array.isArray(req.files)) {
    files = files.concat(req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.keys(req.files).forEach(function(fieldName) {
      if (Array.isArray(req.files[fieldName])) {
        files = files.concat(req.files[fieldName]);
      }
    });
  }

  return files.filter(function(file) {
    return file && file.path && file.filename;
  });
}

function mirrorMulterRequestToR2(req, prefix) {
  var cleanPrefix = trimTrailingSlash(prefix);
  var files = listMulterFiles(req);

  if (!files.length || !isConfigured()) {
    return Promise.resolve([]);
  }

  return Promise.all(files.map(function(file) {
    var key = cleanPrefix + '/' + file.filename;
    return uploadLocalFile(file.path, key).then(function(result) {
      return {
        filename: file.filename,
        key: key,
        url: buildPublicUrl(key),
        result: result
      };
    });
  }));
}

function buildPublicUrl(key) {
  var base = trimTrailingSlash(process.env.S3_PUBLIC_URL);
  if (!base) return '';
  return base + '/' + key;
}

module.exports = {
  isConfigured: isConfigured,
  uploadLocalFile: uploadLocalFile,
  mirrorMulterRequestToR2: mirrorMulterRequestToR2,
  buildPublicUrl: buildPublicUrl
};
