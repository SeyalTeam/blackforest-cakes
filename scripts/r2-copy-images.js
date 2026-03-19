const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const bucket = process.env.S3_BUCKET;
const publicUrl = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '');
const concurrency = parseInt(process.env.CONCURRENCY || '6', 10);
const limit = parseInt(process.env.LIMIT || '0', 10);

if (!bucket) {
  console.error('Missing S3_BUCKET');
  process.exit(1);
}

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: process.env.S3_REGION || 'auto',
  httpOptions: { timeout: 300000 }
});

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function collectFiles(dir, recursive) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir);
  entries.forEach((name) => {
    const fullPath = path.join(dir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (recursive) out.push.apply(out, collectFiles(fullPath, true));
      return;
    }
    out.push({ fullPath, name, size: stat.size });
  });
  return out;
}

async function listExisting(prefix) {
  const existing = {};
  let token = null;
  do {
    const out = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token
    }).promise();
    (out.Contents || []).forEach((item) => {
      existing[item.Key] = item.Size;
    });
    token = out.IsTruncated ? out.NextContinuationToken : null;
  } while (token);
  return existing;
}

async function uploadOne(job, file, existingMap, counters) {
  const key = job.keyPrefix + '/' + file.name;
  if (existingMap[key] === file.size) {
    counters.skipped += 1;
    return;
  }

  await s3.upload({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(file.fullPath),
    ACL: 'public-read',
    ContentType: contentTypeFor(file.fullPath)
  }).promise();

  counters.uploaded += 1;
  if (publicUrl) {
    counters.lastUrl = publicUrl + '/' + key;
  }
}

async function runPool(items, worker, size) {
  let index = 0;
  async function next() {
    if (index >= items.length) return;
    const current = index++;
    await worker(items[current], current);
    return next();
  }
  const workers = [];
  for (let i = 0; i < size; i += 1) workers.push(next());
  await Promise.all(workers);
}

async function main() {
  const jobs = [
    {
      label: 'orders',
      localDir: path.join(process.cwd(), 'uploads', 'orders'),
      keyPrefix: 'blackforest/blackforest-api/orders',
      recursive: false
    },
    {
      label: 'general',
      localDir: path.join(process.cwd(), 'uploads'),
      keyPrefix: 'blackforest/blackforest-api/general',
      recursive: false,
      filter: (file) => path.dirname(file.fullPath) === path.join(process.cwd(), 'uploads')
    }
  ];

  for (const job of jobs) {
    const existing = await listExisting(job.keyPrefix + '/');
    let files = collectFiles(job.localDir, job.recursive);
    if (job.filter) files = files.filter(job.filter);
    if (limit > 0) files = files.slice(0, limit);

    const counters = { uploaded: 0, skipped: 0, failed: 0, lastUrl: '' };
    console.log('START', job.label, 'files=', files.length, 'existing=', Object.keys(existing).length);

    await runPool(files, async (file, idx) => {
      try {
        await uploadOne(job, file, existing, counters);
      } catch (err) {
        counters.failed += 1;
        console.error('FAILED', job.label, file.name, err.code || err.name, err.message);
      }
      if ((idx + 1) % 100 === 0 || idx + 1 === files.length) {
        console.log('PROGRESS', job.label, idx + 1 + '/' + files.length, 'uploaded=' + counters.uploaded, 'skipped=' + counters.skipped, 'failed=' + counters.failed);
      }
    }, concurrency);

    console.log('DONE', job.label, JSON.stringify(counters));
  }
}

main().catch((err) => {
  console.error('FATAL', err.code || err.name, err.message);
  process.exit(1);
});
