const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');

const SRC_DIR = '/root/blackforest-api/uploads/orders';
const OUT_DIR = '/root/blackforest-api/reports/orders/kot_top2_by_amount_2021_2026';
const ZIP_PATH = '/root/blackforest-api/reports/orders/kot_top2_by_amount_2021_2026.zip';
const MANIFEST_JSON = path.join(OUT_DIR, 'manifest.json');
const MANIFEST_CSV = path.join(OUT_DIR, 'manifest.csv');
const SUMMARY_JSON = path.join(OUT_DIR, 'summary.json');

const START_YEAR = 2021;
const END_YEAR = 2026;
const MAX_DIFF_MS = 40 * 24 * 60 * 60 * 1000; // 40 days

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    require("child_process").execSync("rm -rf " + JSON.stringify(dir));
  }
  fs.mkdirSync(dir, { recursive: true });
}

function listMonths(startYear, endYear) {
  const out = [];
  for (let y = startYear; y <= endYear; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      out.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return out;
}

function monthKeyFromMs(ms) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseImageTsMs(file) {
  const m = String(file).match(/^order-doc-(\d{10,13})\./i);
  if (!m) return null;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  if (m[1].length === 10) n *= 1000;
  return n;
}

function toAmount(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sanitize(v) {
  return String(v == null ? '' : v).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function csvEscape(v) {
  const s = String(v == null ? '' : v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function lowerBound(arr, targetMs) {
  let l = 0;
  let r = arr.length;
  while (l < r) {
    const mid = (l + r) >> 1;
    if (arr[mid].createdMs < targetMs) l = mid + 1;
    else r = mid;
  }
  return l;
}

function pickNearestUnusedOrder(orders, used, targetMs) {
  if (!orders.length) return null;

  const idx = lowerBound(orders, targetMs);
  let best = null;

  function consider(i) {
    if (i < 0 || i >= orders.length) return;
    if (used.has(i)) return;
    const diff = Math.abs(orders[i].createdMs - targetMs);
    if (!best || diff < best.diffMs || (diff === best.diffMs && orders[i].amount > best.order.amount)) {
      best = { index: i, order: orders[i], diffMs: diff };
    }
  }

  // scan around insertion point until diff exceeds max on both sides
  let l = idx - 1;
  let r = idx;
  let lDone = false;
  let rDone = false;

  while (!lDone || !rDone) {
    if (!lDone) {
      if (l >= 0 && Math.abs(orders[l].createdMs - targetMs) <= MAX_DIFF_MS) {
        consider(l);
        l -= 1;
      } else {
        lDone = true;
      }
    }

    if (!rDone) {
      if (r < orders.length && Math.abs(orders[r].createdMs - targetMs) <= MAX_DIFF_MS) {
        consider(r);
        r += 1;
      } else {
        rDone = true;
      }
    }
  }

  return best;
}

function run(cmd) {
  const { execSync } = require('child_process');
  execSync(cmd, { stdio: 'inherit' });
}

async function main() {
  cleanDir(OUT_DIR);

  const months = listMonths(START_YEAR, END_YEAR);
  months.forEach((m) => fs.mkdirSync(path.join(OUT_DIR, m), { recursive: true }));

  await mongoose.connect(config.dbString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  const db = mongoose.connection.db;

  const stores = await db.collection('stores').find({}, { projection: { _id: 1, branch: 1 } }).toArray();
  const branchMap = new Map(stores.map((s) => [String(s._id), s.branch || 'Unknown']));

  const orderDocs = await db.collection('orders').find({}, {
    projection: {
      _id: 1,
      created_at: 1,
      amount: 1,
      form_no: 1,
      branch: 1,
      customer_name: 1,
      status: 1,
    }
  }).toArray();

  const ordersByMonth = new Map();
  months.forEach((m) => ordersByMonth.set(m, []));

  for (const o of orderDocs) {
    const createdMs = o.created_at ? new Date(o.created_at).getTime() : (o._id && o._id.getTimestamp ? o._id.getTimestamp().getTime() : NaN);
    if (!Number.isFinite(createdMs)) continue;
    const month = monthKeyFromMs(createdMs);
    if (!ordersByMonth.has(month)) continue;

    const branchId = o.branch ? String(o.branch) : '';
    const branchName = branchId ? (branchMap.get(branchId) || `Unknown (${branchId})`) : 'Unknown';

    ordersByMonth.get(month).push({
      id: String(o._id),
      formNo: o.form_no ? String(o.form_no) : '',
      amount: toAmount(o.amount),
      createdMs,
      createdAtUtc: new Date(createdMs).toISOString(),
      branchName,
      customerName: o.customer_name ? String(o.customer_name) : '',
      status: o.status ? String(o.status) : ''
    });
  }

  for (const arr of ordersByMonth.values()) {
    arr.sort((a, b) => a.createdMs - b.createdMs);
  }

  const files = fs.readdirSync(SRC_DIR).filter((f) => /^order-doc-/i.test(f));
  const imagesByMonth = new Map();
  months.forEach((m) => imagesByMonth.set(m, []));

  for (const f of files) {
    const tsMs = parseImageTsMs(f);
    if (!Number.isFinite(tsMs)) continue;
    const month = monthKeyFromMs(tsMs);
    if (!imagesByMonth.has(month)) continue;
    imagesByMonth.get(month).push({ file: f, tsMs, tsUtc: new Date(tsMs).toISOString() });
  }

  for (const arr of imagesByMonth.values()) {
    arr.sort((a, b) => a.tsMs - b.tsMs);
  }

  const manifest = [];
  const summary = {};

  for (const month of months) {
    const monthOrders = ordersByMonth.get(month) || [];
    const monthImages = imagesByMonth.get(month) || [];
    const usedOrderIdx = new Set();
    const matched = [];

    for (const img of monthImages) {
      const pick = pickNearestUnusedOrder(monthOrders, usedOrderIdx, img.tsMs);
      if (!pick) continue;
      usedOrderIdx.add(pick.index);
      matched.push({ img, order: pick.order, diffMs: pick.diffMs });
    }

    matched.sort((a, b) => {
      if (b.order.amount !== a.order.amount) return b.order.amount - a.order.amount;
      return b.order.createdMs - a.order.createdMs;
    });

    const top2 = matched.slice(0, 2);

    summary[month] = {
      month,
      image_candidates: monthImages.length,
      matched_candidates: matched.length,
      selected: top2.length,
      selected_amounts: top2.map((x) => x.order.amount),
    };

    top2.forEach((x, idx) => {
      const rank = idx + 1;
      const amountTag = String(Math.round(x.order.amount));
      const outName = `${rank}_amt_${amountTag}__${sanitize(x.order.formNo || x.order.id)}__${x.img.file}`;
      const outRel = path.join(month, outName);
      const srcAbs = path.join(SRC_DIR, x.img.file);
      const dstAbs = path.join(OUT_DIR, outRel);
      fs.copyFileSync(srcAbs, dstAbs);

      manifest.push({
        month,
        rank,
        amount: x.order.amount,
        order_id: x.order.id,
        form_no: x.order.formNo,
        branch_name: x.order.branchName,
        customer_name: x.order.customerName,
        status: x.order.status,
        order_created_at_utc: x.order.createdAtUtc,
        image_file: x.img.file,
        image_ts_utc: x.img.tsUtc,
        match_diff_ms: x.diffMs,
        out_path: outRel,
      });
    });
  }

  fs.writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2));

  const csvHeaders = [
    'month','rank','amount','order_id','form_no','branch_name','customer_name','status','order_created_at_utc','image_file','image_ts_utc','match_diff_ms','out_path'
  ];
  const csvRows = [csvHeaders.join(',')];
  for (const m of manifest) {
    csvRows.push([
      m.month,m.rank,m.amount,m.order_id,m.form_no,m.branch_name,m.customer_name,m.status,m.order_created_at_utc,m.image_file,m.image_ts_utc,m.match_diff_ms,m.out_path
    ].map(csvEscape).join(','));
  }
  fs.writeFileSync(MANIFEST_CSV, csvRows.join('\n'));

  const sumPayload = {
    generated_at_utc: new Date().toISOString(),
    range: `${START_YEAR}-01 to ${END_YEAR}-12`,
    max_match_diff_ms: MAX_DIFF_MS,
    selected_total: manifest.length,
    months: summary,
  };
  fs.writeFileSync(SUMMARY_JSON, JSON.stringify(sumPayload, null, 2));

  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  run(`cd /root/blackforest-api/reports/orders && zip -qry kot_top2_by_amount_2021_2026.zip kot_top2_by_amount_2021_2026`);

  console.log('zip=' + ZIP_PATH);
  console.log('selected_total=' + manifest.length);
}

main()
  .catch((err) => {
    console.error('TOP2_KOT_ERROR=' + err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await mongoose.disconnect(); } catch (_) {}
  });
