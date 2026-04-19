var fs = require('fs');
var path = require('path');

function getWritableRoot() {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'blackforest-api');
  }

  return process.cwd();
}

function resolveRuntimePath(relativePath) {
  return path.join(getWritableRoot(), relativePath || '');
}

function ensureRuntimeDir(relativeDir) {
  var targetDir = resolveRuntimePath(relativeDir);
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

function getMulterDestination(relativeDir) {
  return ensureRuntimeDir(relativeDir);
}

function getDocumentFilePath(filename) {
  ensureRuntimeDir('documents');
  return resolveRuntimePath(path.join('documents', filename));
}

function getDocumentPublicPath(filename) {
  return '/documents/' + filename;
}

module.exports = {
  getWritableRoot: getWritableRoot,
  resolveRuntimePath: resolveRuntimePath,
  ensureRuntimeDir: ensureRuntimeDir,
  getMulterDestination: getMulterDestination,
  getDocumentFilePath: getDocumentFilePath,
  getDocumentPublicPath: getDocumentPublicPath
};
