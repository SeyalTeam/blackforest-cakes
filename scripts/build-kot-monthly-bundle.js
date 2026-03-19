const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');

const BASE_DIR = '/root/blackforest-api';
const SRC_DIR = path.join(BASE_DIR, 'uploads', 'orders');
const OUT_ROOT = path.join(BASE_DIR, 'reports', 'orders', 'kot_by_month_2021_2026');
const MANIFEST_JSON = path.join(OUT_ROOT, 'manifest.json');
const MANIFEST_CSV = path.join(OUT_ROOT, 'manifest.csv');
const SUMMARY_JSON = path.join(OUT_ROOT, 'summary.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function toDate(value, fallbackObjectId) {
  if (value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (fallbackObjectId && fallbackObjectId.getTimestamp) {
    return fallbackObjectId.getTimestamp();
  }
  return null;
}

function monthKeyUTC(dateObj) {
  return `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}`;
}

function csvEscape(v) {
  const s = String(v == null ? '' : v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function listMonthRange(startYear, endYear) {
  const months = [];
  for (let y = startYear; y <= endYear; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
}

async function main() {
  cleanDir(OUT_ROOT);

  await mongoose.connect(config.dbString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  const db = mongoose.connection.db;
  const stores = await db.collection('stores').find({}, { projection: { _id: 1, branch: 1 } }).toArray();
  const branchMap = new Map(stores.map((s) => [String(s._id), s.branch || 'Unknown']));

  const docs = await db.collection('orders').find(
    { order_doc: { $exists: true, $nin: ['', null] } },
    {
      projection: {
        _id: 1,
        form_no: 1,
        order_doc: 1,
        created_at: 1,
        branch: 1,
        customer_name: 1,
        customer_phone: 1,
        status: 1,
      },
    }
  ).toArray();

  const months = listMonthRange(2021, 2026);
  const monthSummary = {};
  months.forEach((m) => {
    monthSummary[m] = { copied: 0, missing: 0, records: 0 };
    ensureDir(path.join(OUT_ROOT, m));
  });

  const manifest = [];
  let copied = 0;
  let missing = 0;
  let outsideRange = 0;

  for (const d of docs) {
    const createdAt = toDate(d.created_at, d._id);
    if (!createdAt) continue;
    const month = monthKeyUTC(createdAt);
    if (!monthSummary[month]) {
      outsideRange += 1;
      continue;
    }

    const fileName = String(d.order_doc || '').trim();
    const src = path.join(SRC_DIR, fileName);
    const branchId = d.branch ? String(d.branch) : '';
    const branchName = branchId ? (branchMap.get(branchId) || `Unknown (${branchId})`) : 'Unknown';

    const safePrefix = (d.form_no ? String(d.form_no) : String(d._id)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const outFileName = `${safePrefix}__${fileName}`;
    const outRelPath = path.join(month, outFileName);
    const outAbsPath = path.join(OUT_ROOT, outRelPath);

    const rec = {
      order_id: String(d._id),
      form_no: d.form_no ? String(d.form_no) : '',
      month,
      created_at_utc: createdAt.toISOString(),
      branch_name: branchName,
      customer_name: d.customer_name ? String(d.customer_name) : '',
      customer_phone: d.customer_phone ? String(d.customer_phone) : '',
      status: d.status ? String(d.status) : '',
      order_doc: fileName,
      source_path: src,
      out_path: outRelPath,
      copied: false,
      missing: false,
    };

    monthSummary[month].records += 1;

    if (fileName && fs.existsSync(src)) {
      fs.copyFileSync(src, outAbsPath);
      rec.copied = true;
      monthSummary[month].copied += 1;
      copied += 1;
    } else {
      rec.missing = true;
      monthSummary[month].missing += 1;
      missing += 1;
    }

    manifest.push(rec);
  }

  fs.writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2));

  const csvHeaders = [
    'order_id','form_no','month','created_at_utc','branch_name','customer_name','customer_phone','status','order_doc','out_path','copied','missing'
  ];
  const csvLines = [csvHeaders.join(',')];
  for (const m of manifest) {
    csvLines.push([
      m.order_id,
      m.form_no,
      m.month,
      m.created_at_utc,
      m.branch_name,
      m.customer_name,
      m.customer_phone,
      m.status,
      m.order_doc,
      m.out_path,
      m.copied,
      m.missing,
    ].map(csvEscape).join(','));
  }
  fs.writeFileSync(MANIFEST_CSV, csvLines.join('\n'));

  const summary = {
    generated_at_utc: new Date().toISOString(),
    range: '2021-01 to 2026-12',
    total_records_considered: manifest.length,
    copied,
    missing,
    outside_range: outsideRange,
    months: monthSummary,
  };
  fs.writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2));

  console.log('out_root=' + OUT_ROOT);
  console.log('records=' + manifest.length);
  console.log('copied=' + copied);
  console.log('missing=' + missing);
  console.log('outside_range=' + outsideRange);
}

main()
  .catch((err) => {
    console.error('KOT_BUNDLE_ERROR=' + err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await mongoose.disconnect(); } catch (_) {}
  });
