const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config');

const OUT_DIR = path.resolve(__dirname, '..', 'reports', 'orders');
const MONTHLY_DIR = path.join(OUT_DIR, 'monthly');
const META_PATH = path.join(OUT_DIR, 'orders_report_metadata.json');
const OVERALL_PDF = path.join(OUT_DIR, 'orders_overall_summary.pdf');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fmtNumber(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0';
}

function pad2(v) {
  return String(v).padStart(2, '0');
}

function monthLabel(y, m) {
  return `${y}-${pad2(m)}`;
}

function pdfEscape(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function makePdf(lines, outputPath, options = {}) {
  const pageWidth = options.pageWidth || 595;
  const pageHeight = options.pageHeight || 842;
  const marginLeft = options.marginLeft || 44;
  const marginTop = options.marginTop || 44;
  const fontSize = options.fontSize || 10;
  const leading = options.leading || 13;
  const maxLinesPerPage = options.maxLinesPerPage || Math.floor((pageHeight - marginTop * 2) / leading);

  const pages = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage));
  }
  if (pages.length === 0) pages.push(['']);

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageObjectNumbers = [];
  const contentObjectNumbers = [];

  let objNo = 4;
  for (let i = 0; i < pages.length; i += 1) {
    pageObjectNumbers.push(objNo);
    contentObjectNumbers.push(objNo + 1);
    objNo += 2;
  }

  for (let i = 0; i < pages.length; i += 1) {
    const pageNo = i + 1;
    const pageLines = pages[i].map((line) => pdfEscape(line));
    const content = [
      'BT',
      `/F1 ${fontSize} Tf`,
      `${leading} TL`,
      `${marginLeft} ${pageHeight - marginTop} Td`,
      ...pageLines.map((line) => `(${line}) Tj\nT*`),
      'ET',
      ''
    ].join('\n');

    objects[pageObjectNumbers[i] - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumbers[i]} 0 R >>`;

    objects[contentObjectNumbers[i] - 1] = `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}endstream`;
  }

  const kids = pageObjectNumbers.map((n) => `${n} 0 R`).join(' ');
  objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageObjectNumbers.length} >>`;

  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(output, 'utf8'));
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${objects.length + 1}\n`;
  output += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    output += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(outputPath, output);
}

function buildMonthLines(row, generatedAt) {
  const status = row.statusCounts || {};
  return [
    'BLACKFOREST API - ORDERS MONTHLY REPORT',
    `Month: ${row.month}`,
    `Generated At (UTC): ${generatedAt}`,
    '',
    'SUMMARY',
    `Total Orders: ${fmtNumber(row.orderCount)}`,
    `Total Amount: ${fmtNumber(row.totalAmount)}`,
    `Total Advance: ${fmtNumber(row.totalAdvance)}`,
    `Total Balance: ${fmtNumber(row.totalBalance)}`,
    `Delivered (status=7): ${fmtNumber(row.deliveredCount)}`,
    `Cancelled (status=2): ${fmtNumber(row.cancelledCount)}`,
    '',
    'STATUS BREAKDOWN',
    `1 Ordered: ${fmtNumber(status['1'] || 0)}`,
    `2 Cancelled: ${fmtNumber(status['2'] || 0)}`,
    `3 Completed: ${fmtNumber(status['3'] || 0)}`,
    `4 Prepared: ${fmtNumber(status['4'] || 0)}`,
    `5 Ready: ${fmtNumber(status['5'] || 0)}`,
    `6 Picked: ${fmtNumber(status['6'] || 0)}`,
    `7 Delivered: ${fmtNumber(status['7'] || 0)}`,
    `8 Not Delivered: ${fmtNumber(status['8'] || 0)}`,
    '',
    'File scope: month-only summary for orders collection.'
  ];
}

function buildOverallLines(meta, generatedAt) {
  const lines = [
    'BLACKFOREST API - ORDERS OVERALL REPORT',
    `Generated At (UTC): ${generatedAt}`,
    `Date Range: ${meta.range.startMonth} to ${meta.range.endMonth}`,
    '',
    'OVERALL TOTALS',
    `Total Orders: ${fmtNumber(meta.overall.orderCount)}`,
    `Total Amount: ${fmtNumber(meta.overall.totalAmount)}`,
    `Total Advance: ${fmtNumber(meta.overall.totalAdvance)}`,
    `Total Balance: ${fmtNumber(meta.overall.totalBalance)}`,
    `Delivered (status=7): ${fmtNumber(meta.overall.deliveredCount)}`,
    `Cancelled (status=2): ${fmtNumber(meta.overall.cancelledCount)}`,
    '',
    'MONTH-WISE SUMMARY',
    'Month       Orders     Amount        Advance       Balance       Delivered   Cancelled',
    '--------------------------------------------------------------------------------------'
  ];

  for (const row of meta.months) {
    const line = [
      row.month.padEnd(10, ' '),
      String(row.orderCount).padStart(8, ' '),
      fmtNumber(row.totalAmount).padStart(13, ' '),
      fmtNumber(row.totalAdvance).padStart(13, ' '),
      fmtNumber(row.totalBalance).padStart(13, ' '),
      String(row.deliveredCount).padStart(10, ' '),
      String(row.cancelledCount).padStart(10, ' ')
    ].join(' ');
    lines.push(line);
  }

  lines.push('');
  lines.push(`Monthly PDFs generated: ${meta.months.length}`);
  lines.push(`Monthly folder: ${MONTHLY_DIR}`);
  return lines;
}

function normalizeMonthlyRows(rows) {
  return rows.map((r) => {
    const m = monthLabel(r._id.y, r._id.m);
    return {
      month: m,
      year: r._id.y,
      monthNum: r._id.m,
      orderCount: r.orderCount || 0,
      totalAmount: r.totalAmount || 0,
      totalAdvance: r.totalAdvance || 0,
      totalBalance: r.totalBalance || 0,
      deliveredCount: r.deliveredCount || 0,
      cancelledCount: r.cancelledCount || 0,
      statusCounts: {
        '1': r.status1 || 0,
        '2': r.status2 || 0,
        '3': r.status3 || 0,
        '4': r.status4 || 0,
        '5': r.status5 || 0,
        '6': r.status6 || 0,
        '7': r.status7 || 0,
        '8': r.status8 || 0
      }
    };
  });
}

async function main() {
  ensureDir(OUT_DIR);
  ensureDir(MONTHLY_DIR);

  await mongoose.connect(config.dbString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  const ordersCol = mongoose.connection.db.collection('orders');
  const generatedAt = new Date().toISOString();

  const pipeline = [
    {
      $addFields: {
        _createdAt: { $ifNull: ['$created_at', { $toDate: '$_id' }] },
        _amountNum: { $convert: { input: '$amount', to: 'double', onError: 0, onNull: 0 } },
        _advanceNum: { $convert: { input: '$advance', to: 'double', onError: 0, onNull: 0 } },
        _balanceNum: { $convert: { input: '$balance', to: 'double', onError: 0, onNull: 0 } },
        _statusStr: { $toString: '$status' }
      }
    },
    {
      $group: {
        _id: {
          y: { $year: '$_createdAt' },
          m: { $month: '$_createdAt' }
        },
        orderCount: { $sum: 1 },
        totalAmount: { $sum: '$_amountNum' },
        totalAdvance: { $sum: '$_advanceNum' },
        totalBalance: { $sum: '$_balanceNum' },
        deliveredCount: { $sum: { $cond: [{ $eq: ['$_statusStr', '7'] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ['$_statusStr', '2'] }, 1, 0] } },
        status1: { $sum: { $cond: [{ $eq: ['$_statusStr', '1'] }, 1, 0] } },
        status2: { $sum: { $cond: [{ $eq: ['$_statusStr', '2'] }, 1, 0] } },
        status3: { $sum: { $cond: [{ $eq: ['$_statusStr', '3'] }, 1, 0] } },
        status4: { $sum: { $cond: [{ $eq: ['$_statusStr', '4'] }, 1, 0] } },
        status5: { $sum: { $cond: [{ $eq: ['$_statusStr', '5'] }, 1, 0] } },
        status6: { $sum: { $cond: [{ $eq: ['$_statusStr', '6'] }, 1, 0] } },
        status7: { $sum: { $cond: [{ $eq: ['$_statusStr', '7'] }, 1, 0] } },
        status8: { $sum: { $cond: [{ $eq: ['$_statusStr', '8'] }, 1, 0] } }
      }
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } }
  ];

  const grouped = await ordersCol.aggregate(pipeline, { allowDiskUse: true }).toArray();
  const months = normalizeMonthlyRows(grouped);

  if (!months.length) {
    throw new Error('No orders data found in collection orders.');
  }

  let overall = {
    orderCount: 0,
    totalAmount: 0,
    totalAdvance: 0,
    totalBalance: 0,
    deliveredCount: 0,
    cancelledCount: 0
  };

  for (const row of months) {
    overall.orderCount += row.orderCount;
    overall.totalAmount += row.totalAmount;
    overall.totalAdvance += row.totalAdvance;
    overall.totalBalance += row.totalBalance;
    overall.deliveredCount += row.deliveredCount;
    overall.cancelledCount += row.cancelledCount;

    const monthlyPdf = path.join(MONTHLY_DIR, `orders_${row.month}.pdf`);
    makePdf(buildMonthLines(row, generatedAt), monthlyPdf, {
      fontSize: 11,
      leading: 15,
      maxLinesPerPage: 45
    });
  }

  const meta = {
    generatedAt,
    range: {
      startMonth: months[0].month,
      endMonth: months[months.length - 1].month
    },
    overall,
    months
  };

  makePdf(buildOverallLines(meta, generatedAt), OVERALL_PDF, {
    fontSize: 8,
    leading: 9,
    maxLinesPerPage: 82,
    marginLeft: 30,
    marginTop: 30
  });

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));

  console.log(`Generated monthly PDFs: ${months.length}`);
  console.log(`Monthly folder: ${MONTHLY_DIR}`);
  console.log(`Overall PDF: ${OVERALL_PDF}`);
  console.log(`Metadata JSON: ${META_PATH}`);
  console.log(`Range: ${meta.range.startMonth} to ${meta.range.endMonth}`);
  console.log(`Orders total: ${overall.orderCount}`);
}

main()
  .catch((err) => {
    console.error('REPORT_ERROR:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  });
