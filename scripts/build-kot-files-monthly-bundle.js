const fs = require('fs');
const path = require('path');

const SRC_DIR = '/root/blackforest-api/uploads/orders';
const OUT_DIR = '/root/blackforest-api/reports/orders/kot_files_by_month_2021_2026';
const ZIP_PATH = '/root/blackforest-api/reports/orders/kot_files_by_month_2021_2026.zip';
const SUMMARY_JSON = path.join(OUT_DIR, 'summary.json');

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function monthKeyFromEpochMs(ms) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function parseEpochMsFromName(file) {
  const m = file.match(/^order-doc-(\d{10,13})\./i);
  if (!m) return null;
  const raw = m[1];
  let n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (raw.length === 10) n *= 1000;
  return n;
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

function run(cmd) {
  const { execSync } = require('child_process');
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  cleanDir(OUT_DIR);

  const months = listMonths(2021, 2026);
  const summary = {};
  months.forEach((m) => {
    const p = path.join(OUT_DIR, m);
    fs.mkdirSync(p, { recursive: true });
    summary[m] = 0;
  });

  const files = fs.readdirSync(SRC_DIR).filter((f) => /^order-doc-/i.test(f));

  let totalMatchedPattern = 0;
  let totalInRange = 0;
  let parseFailed = 0;
  let outOfRange = 0;

  files.forEach((f) => {
    const ms = parseEpochMsFromName(f);
    if (!ms) {
      parseFailed += 1;
      return;
    }
    totalMatchedPattern += 1;
    const month = monthKeyFromEpochMs(ms);
    if (!month || !summary.hasOwnProperty(month)) {
      outOfRange += 1;
      return;
    }

    const src = path.join(SRC_DIR, f);
    const dst = path.join(OUT_DIR, month, f);

    // hardlink avoids duplicating disk while organizing by month
    try {
      fs.linkSync(src, dst);
    } catch (e) {
      // fallback copy only if hardlink fails
      fs.copyFileSync(src, dst);
    }

    summary[month] += 1;
    totalInRange += 1;
  });

  const payload = {
    generated_at_utc: new Date().toISOString(),
    source: SRC_DIR,
    range: '2021-01 to 2026-12',
    total_files_in_source_matching_prefix: files.length,
    total_matched_timestamp_pattern: totalMatchedPattern,
    total_in_range: totalInRange,
    out_of_range: outOfRange,
    parse_failed: parseFailed,
    months: summary,
  };

  fs.writeFileSync(SUMMARY_JSON, JSON.stringify(payload, null, 2));

  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  run(`cd /root/blackforest-api/reports/orders && zip -qry kot_files_by_month_2021_2026.zip kot_files_by_month_2021_2026`);

  console.log('zip=' + ZIP_PATH);
  console.log('total_in_range=' + totalInRange);
}

main();
