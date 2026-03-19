const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const xl = require('excel4node');
const config = require('../config/config');

const OUT_DIR = path.resolve(__dirname, '..', 'reports', 'orders');
const OUT_FILE = path.join(OUT_DIR, 'orders_report_proper.xlsx');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function monthLabelFromDate(dateObj) {
  return `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}`;
}

function toDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toUtcText(dateObj) {
  if (!dateObj) return '';
  return dateObj.toISOString().replace('T', ' ').slice(0, 19);
}

function statusText(code) {
  switch (String(code || '')) {
    case '1': return 'Ordered';
    case '2': return 'Cancelled';
    case '3': return 'Completed';
    case '4': return 'Prepared';
    case '5': return 'Ready';
    case '6': return 'Picked';
    case '7': return 'Delivered';
    case '8': return 'Not Delivered';
    default: return 'Unknown';
  }
}

function setColWidths(ws, widths) {
  widths.forEach((w, i) => ws.column(i + 1).setWidth(w));
}

function makeMonthAccumulator() {
  return {
    orderCount: 0,
    totalAmount: 0,
    totalAdvance: 0,
    totalBalance: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    status1: 0,
    status2: 0,
    status3: 0,
    status4: 0,
    status5: 0,
    status6: 0,
    status7: 0,
    status8: 0
  };
}

function applyOrderToAccumulator(acc, order) {
  acc.orderCount += 1;
  acc.totalAmount += order.amount;
  acc.totalAdvance += order.advance;
  acc.totalBalance += order.balance;

  if (order.status === '7') acc.deliveredCount += 1;
  if (order.status === '2') acc.cancelledCount += 1;

  if (order.status === '1') acc.status1 += 1;
  else if (order.status === '2') acc.status2 += 1;
  else if (order.status === '3') acc.status3 += 1;
  else if (order.status === '4') acc.status4 += 1;
  else if (order.status === '5') acc.status5 += 1;
  else if (order.status === '6') acc.status6 += 1;
  else if (order.status === '7') acc.status7 += 1;
  else if (order.status === '8') acc.status8 += 1;
}

async function fetchBranchMap(db) {
  const stores = await db.collection('stores').find({}, { projection: { _id: 1, branch: 1 } }).toArray();
  const m = new Map();
  stores.forEach((s) => {
    const key = String(s._id);
    const name = s.branch ? String(s.branch) : 'Unknown Branch';
    m.set(key, name);
  });
  return m;
}

async function fetchOrders(db, branchMap) {
  const orders = await db.collection('orders').find({}, {
    projection: {
      _id: 1,
      form_no: 1,
      customer_name: 1,
      customer_phone: 1,
      branch: 1,
      status: 1,
      amount: 1,
      advance: 1,
      balance: 1,
      created_at: 1,
      delivery_date: 1,
      delivery_type: 1
    }
  }).toArray();

  return orders.map((o) => {
    const createdAt = toDateSafe(o.created_at) || (o._id && o._id.getTimestamp ? o._id.getTimestamp() : null) || new Date(0);
    const deliveryDate = toDateSafe(o.delivery_date);
    const branchId = o.branch ? String(o.branch) : '';
    const branchName = branchId ? (branchMap.get(branchId) || `Unknown (${branchId})`) : 'Unknown';
    const status = String(o.status || '');
    return {
      id: String(o._id),
      formNo: o.form_no ? String(o.form_no) : '',
      customerName: o.customer_name ? String(o.customer_name) : '',
      customerPhone: o.customer_phone ? String(o.customer_phone) : '',
      branchId,
      branchName,
      status,
      statusLabel: statusText(status),
      amount: toNum(o.amount),
      advance: toNum(o.advance),
      balance: toNum(o.balance),
      createdAt,
      createdAtText: toUtcText(createdAt),
      deliveryDateText: toUtcText(deliveryDate),
      deliveryType: o.delivery_type ? String(o.delivery_type) : '',
      month: monthLabelFromDate(createdAt)
    };
  });
}

function buildAggregates(orderRows) {
  const monthlyMap = new Map();
  const branchMonthlyMap = new Map();
  const branchTotalMap = new Map();
  const overall = makeMonthAccumulator();

  orderRows.forEach((order) => {
    applyOrderToAccumulator(overall, order);

    if (!monthlyMap.has(order.month)) monthlyMap.set(order.month, makeMonthAccumulator());
    applyOrderToAccumulator(monthlyMap.get(order.month), order);

    const branchKey = `${order.month}||${order.branchName}`;
    if (!branchMonthlyMap.has(branchKey)) {
      branchMonthlyMap.set(branchKey, { month: order.month, branchName: order.branchName, ...makeMonthAccumulator() });
    }
    applyOrderToAccumulator(branchMonthlyMap.get(branchKey), order);

    if (!branchTotalMap.has(order.branchName)) {
      branchTotalMap.set(order.branchName, { branchName: order.branchName, ...makeMonthAccumulator() });
    }
    applyOrderToAccumulator(branchTotalMap.get(order.branchName), order);
  });

  const monthlyRows = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({ month, ...data }));

  const branchMonthlyRows = Array.from(branchMonthlyMap.values())
    .sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      return a.branchName.localeCompare(b.branchName);
    });

  const branchTotalRows = Array.from(branchTotalMap.values())
    .sort((a, b) => b.orderCount - a.orderCount || a.branchName.localeCompare(b.branchName));

  const yearlyMap = new Map();
  monthlyRows.forEach((r) => {
    const y = Number(r.month.slice(0, 4));
    if (!yearlyMap.has(y)) {
      yearlyMap.set(y, {
        year: y,
        months: 0,
        orderCount: 0,
        totalAmount: 0,
        totalAdvance: 0,
        totalBalance: 0,
        deliveredCount: 0,
        cancelledCount: 0
      });
    }
    const yr = yearlyMap.get(y);
    yr.months += 1;
    yr.orderCount += r.orderCount;
    yr.totalAmount += r.totalAmount;
    yr.totalAdvance += r.totalAdvance;
    yr.totalBalance += r.totalBalance;
    yr.deliveredCount += r.deliveredCount;
    yr.cancelledCount += r.cancelledCount;
  });

  const yearlyRows = Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);

  return { overall, monthlyRows, branchMonthlyRows, branchTotalRows, yearlyRows };
}

function buildWorkbook(payload) {
  const { generatedAt, orderRows, aggregates } = payload;
  const { overall, monthlyRows, branchMonthlyRows, branchTotalRows, yearlyRows } = aggregates;

  const wb = new xl.Workbook();

  const titleStyle = wb.createStyle({ font: { bold: true, size: 14, color: '#1F4E78' } });
  const subTitleStyle = wb.createStyle({ font: { bold: true, size: 11, color: '#1F4E78' } });
  const labelStyle = wb.createStyle({
    font: { bold: true },
    fill: { type: 'pattern', patternType: 'solid', fgColor: '#E9EFF7' },
    border: {
      left: { style: 'thin', color: '#D9D9D9' },
      right: { style: 'thin', color: '#D9D9D9' },
      top: { style: 'thin', color: '#D9D9D9' },
      bottom: { style: 'thin', color: '#D9D9D9' }
    }
  });
  const headerStyle = wb.createStyle({
    font: { bold: true, color: '#FFFFFF' },
    fill: { type: 'pattern', patternType: 'solid', fgColor: '#1F4E78' },
    alignment: { horizontal: 'center' }
  });
  const textCellStyle = wb.createStyle({
    border: {
      left: { style: 'thin', color: '#D9D9D9' },
      right: { style: 'thin', color: '#D9D9D9' },
      top: { style: 'thin', color: '#D9D9D9' },
      bottom: { style: 'thin', color: '#D9D9D9' }
    }
  });
  const numCellStyle = wb.createStyle({
    numberFormat: '#,##0',
    border: {
      left: { style: 'thin', color: '#D9D9D9' },
      right: { style: 'thin', color: '#D9D9D9' },
      top: { style: 'thin', color: '#D9D9D9' },
      bottom: { style: 'thin', color: '#D9D9D9' }
    }
  });
  const amtCellStyle = wb.createStyle({
    numberFormat: '#,##0.00',
    border: {
      left: { style: 'thin', color: '#D9D9D9' },
      right: { style: 'thin', color: '#D9D9D9' },
      top: { style: 'thin', color: '#D9D9D9' },
      bottom: { style: 'thin', color: '#D9D9D9' }
    }
  });
  const totalStyle = wb.createStyle({
    font: { bold: true },
    fill: { type: 'pattern', patternType: 'solid', fgColor: '#F4F7FB' },
    numberFormat: '#,##0.00',
    border: {
      left: { style: 'thin', color: '#D9D9D9' },
      right: { style: 'thin', color: '#D9D9D9' },
      top: { style: 'thin', color: '#D9D9D9' },
      bottom: { style: 'thin', color: '#D9D9D9' }
    }
  });
  const totalIntStyle = wb.createStyle({
    font: { bold: true },
    fill: { type: 'pattern', patternType: 'solid', fgColor: '#F4F7FB' },
    numberFormat: '#,##0',
    border: {
      left: { style: 'thin', color: '#D9D9D9' },
      right: { style: 'thin', color: '#D9D9D9' },
      top: { style: 'thin', color: '#D9D9D9' },
      bottom: { style: 'thin', color: '#D9D9D9' }
    }
  });

  const startMonth = monthlyRows[0].month;
  const endMonth = monthlyRows[monthlyRows.length - 1].month;

  const overview = wb.addWorksheet('Overview');
  setColWidths(overview, [30, 24, 20, 20, 20, 18, 18, 18]);

  overview.cell(1, 1, 1, 8, true).string('BLACKFOREST - Orders Report (with Branch)').style(titleStyle);
  overview.cell(3, 1).string('Generated At (UTC)').style(labelStyle);
  overview.cell(3, 2).string(generatedAt).style(textCellStyle);
  overview.cell(4, 1).string('Data Range (Month)').style(labelStyle);
  overview.cell(4, 2).string(`${startMonth} to ${endMonth}`).style(textCellStyle);
  overview.cell(5, 1).string('Months Included').style(labelStyle);
  overview.cell(5, 2).number(monthlyRows.length).style(numCellStyle);
  overview.cell(6, 1).string('Orders Included').style(labelStyle);
  overview.cell(6, 2).number(overall.orderCount).style(numCellStyle);

  overview.cell(8, 1, 8, 4, true).string('Overall Totals').style(subTitleStyle);
  overview.cell(9, 1).string('Total Orders').style(labelStyle);
  overview.cell(9, 2).number(overall.orderCount).style(totalIntStyle);
  overview.cell(10, 1).string('Total Amount').style(labelStyle);
  overview.cell(10, 2).number(overall.totalAmount).style(totalStyle);
  overview.cell(11, 1).string('Total Advance').style(labelStyle);
  overview.cell(11, 2).number(overall.totalAdvance).style(totalStyle);
  overview.cell(12, 1).string('Total Balance').style(labelStyle);
  overview.cell(12, 2).number(overall.totalBalance).style(totalStyle);
  overview.cell(13, 1).string('Delivered (status=7)').style(labelStyle);
  overview.cell(13, 2).number(overall.deliveredCount).style(totalIntStyle);
  overview.cell(14, 1).string('Cancelled (status=2)').style(labelStyle);
  overview.cell(14, 2).number(overall.cancelledCount).style(totalIntStyle);

  overview.cell(16, 1, 16, 8, true).string('Yearly Totals').style(subTitleStyle);
  const yearlyHeaders = ['Year', 'Months', 'Orders', 'Amount', 'Advance', 'Balance', 'Delivered', 'Cancelled'];
  yearlyHeaders.forEach((h, idx) => overview.cell(17, idx + 1).string(h).style(headerStyle));

  let yrRow = 18;
  yearlyRows.forEach((r) => {
    overview.cell(yrRow, 1).number(r.year).style(numCellStyle);
    overview.cell(yrRow, 2).number(r.months).style(numCellStyle);
    overview.cell(yrRow, 3).number(r.orderCount).style(numCellStyle);
    overview.cell(yrRow, 4).number(r.totalAmount).style(amtCellStyle);
    overview.cell(yrRow, 5).number(r.totalAdvance).style(amtCellStyle);
    overview.cell(yrRow, 6).number(r.totalBalance).style(amtCellStyle);
    overview.cell(yrRow, 7).number(r.deliveredCount).style(numCellStyle);
    overview.cell(yrRow, 8).number(r.cancelledCount).style(numCellStyle);
    yrRow += 1;
  });

  overview.cell(yrRow + 1, 1, yrRow + 1, 8, true).string('Top Branches By Orders').style(subTitleStyle);
  const branchHdrRow = yrRow + 2;
  const branchHeaders = ['Branch', 'Orders', 'Amount', 'Advance', 'Balance', 'Delivered', 'Cancelled'];
  branchHeaders.forEach((h, idx) => overview.cell(branchHdrRow, idx + 1).string(h).style(headerStyle));

  let brRow = branchHdrRow + 1;
  branchTotalRows.slice(0, 15).forEach((r) => {
    overview.cell(brRow, 1).string(r.branchName).style(textCellStyle);
    overview.cell(brRow, 2).number(r.orderCount).style(numCellStyle);
    overview.cell(brRow, 3).number(r.totalAmount).style(amtCellStyle);
    overview.cell(brRow, 4).number(r.totalAdvance).style(amtCellStyle);
    overview.cell(brRow, 5).number(r.totalBalance).style(amtCellStyle);
    overview.cell(brRow, 6).number(r.deliveredCount).style(numCellStyle);
    overview.cell(brRow, 7).number(r.cancelledCount).style(numCellStyle);
    brRow += 1;
  });

  const monthly = wb.addWorksheet('Monthly Summary');
  setColWidths(monthly, [14, 12, 16, 16, 16, 12, 12]);
  const monthlyHeaders = ['Month', 'Orders', 'Amount', 'Advance', 'Balance', 'Delivered', 'Cancelled'];
  monthlyHeaders.forEach((h, idx) => monthly.cell(1, idx + 1).string(h).style(headerStyle));

  let mRow = 2;
  monthlyRows.forEach((r) => {
    monthly.cell(mRow, 1).string(r.month).style(textCellStyle);
    monthly.cell(mRow, 2).number(r.orderCount).style(numCellStyle);
    monthly.cell(mRow, 3).number(r.totalAmount).style(amtCellStyle);
    monthly.cell(mRow, 4).number(r.totalAdvance).style(amtCellStyle);
    monthly.cell(mRow, 5).number(r.totalBalance).style(amtCellStyle);
    monthly.cell(mRow, 6).number(r.deliveredCount).style(numCellStyle);
    monthly.cell(mRow, 7).number(r.cancelledCount).style(numCellStyle);
    mRow += 1;
  });

  monthly.cell(mRow, 1).string('TOTAL').style(labelStyle);
  monthly.cell(mRow, 2).number(overall.orderCount).style(totalIntStyle);
  monthly.cell(mRow, 3).number(overall.totalAmount).style(totalStyle);
  monthly.cell(mRow, 4).number(overall.totalAdvance).style(totalStyle);
  monthly.cell(mRow, 5).number(overall.totalBalance).style(totalStyle);
  monthly.cell(mRow, 6).number(overall.deliveredCount).style(totalIntStyle);
  monthly.cell(mRow, 7).number(overall.cancelledCount).style(totalIntStyle);

  const branchMonthly = wb.addWorksheet('Branch Monthly');
  setColWidths(branchMonthly, [12, 26, 12, 16, 16, 16, 12, 12]);
  const branchMonthlyHeaders = ['Month', 'Branch', 'Orders', 'Amount', 'Advance', 'Balance', 'Delivered', 'Cancelled'];
  branchMonthlyHeaders.forEach((h, idx) => branchMonthly.cell(1, idx + 1).string(h).style(headerStyle));

  let bmRow = 2;
  branchMonthlyRows.forEach((r) => {
    branchMonthly.cell(bmRow, 1).string(r.month).style(textCellStyle);
    branchMonthly.cell(bmRow, 2).string(r.branchName).style(textCellStyle);
    branchMonthly.cell(bmRow, 3).number(r.orderCount).style(numCellStyle);
    branchMonthly.cell(bmRow, 4).number(r.totalAmount).style(amtCellStyle);
    branchMonthly.cell(bmRow, 5).number(r.totalAdvance).style(amtCellStyle);
    branchMonthly.cell(bmRow, 6).number(r.totalBalance).style(amtCellStyle);
    branchMonthly.cell(bmRow, 7).number(r.deliveredCount).style(numCellStyle);
    branchMonthly.cell(bmRow, 8).number(r.cancelledCount).style(numCellStyle);
    bmRow += 1;
  });

  const status = wb.addWorksheet('Status Breakdown');
  setColWidths(status, [14, 12, 12, 12, 12, 12, 12, 12, 12]);
  const statusHeaders = [
    'Month',
    '1 Ordered',
    '2 Cancelled',
    '3 Completed',
    '4 Prepared',
    '5 Ready',
    '6 Picked',
    '7 Delivered',
    '8 Not Delivered'
  ];
  statusHeaders.forEach((h, idx) => status.cell(1, idx + 1).string(h).style(headerStyle));

  let sRow = 2;
  monthlyRows.forEach((r) => {
    status.cell(sRow, 1).string(r.month).style(textCellStyle);
    status.cell(sRow, 2).number(r.status1).style(numCellStyle);
    status.cell(sRow, 3).number(r.status2).style(numCellStyle);
    status.cell(sRow, 4).number(r.status3).style(numCellStyle);
    status.cell(sRow, 5).number(r.status4).style(numCellStyle);
    status.cell(sRow, 6).number(r.status5).style(numCellStyle);
    status.cell(sRow, 7).number(r.status6).style(numCellStyle);
    status.cell(sRow, 8).number(r.status7).style(numCellStyle);
    status.cell(sRow, 9).number(r.status8).style(numCellStyle);
    sRow += 1;
  });

  status.cell(sRow, 1).string('TOTAL').style(labelStyle);
  status.cell(sRow, 2).number(overall.status1).style(totalIntStyle);
  status.cell(sRow, 3).number(overall.status2).style(totalIntStyle);
  status.cell(sRow, 4).number(overall.status3).style(totalIntStyle);
  status.cell(sRow, 5).number(overall.status4).style(totalIntStyle);
  status.cell(sRow, 6).number(overall.status5).style(totalIntStyle);
  status.cell(sRow, 7).number(overall.status6).style(totalIntStyle);
  status.cell(sRow, 8).number(overall.status7).style(totalIntStyle);
  status.cell(sRow, 9).number(overall.status8).style(totalIntStyle);

  const orderWise = wb.addWorksheet('Order Wise');
  setColWidths(orderWise, [28, 14, 20, 10, 26, 24, 16, 10, 14, 14, 14, 14, 20, 12]);
  const orderHeaders = [
    'Order ID',
    'Form No',
    'Created At (UTC)',
    'Month',
    'Branch Name',
    'Customer Name',
    'Customer Phone',
    'Status',
    'Status Text',
    'Amount',
    'Advance',
    'Balance',
    'Delivery Date (UTC)',
    'Delivery Type'
  ];
  orderHeaders.forEach((h, idx) => orderWise.cell(1, idx + 1).string(h).style(headerStyle));

  const sortedOrders = orderRows.slice().sort((a, b) => b.createdAt - a.createdAt);
  let oRow = 2;
  sortedOrders.forEach((o) => {
    orderWise.cell(oRow, 1).string(o.id);
    orderWise.cell(oRow, 2).string(o.formNo);
    orderWise.cell(oRow, 3).string(o.createdAtText);
    orderWise.cell(oRow, 4).string(o.month);
    orderWise.cell(oRow, 5).string(o.branchName);
    orderWise.cell(oRow, 6).string(o.customerName);
    orderWise.cell(oRow, 7).string(o.customerPhone);
    orderWise.cell(oRow, 8).string(o.status);
    orderWise.cell(oRow, 9).string(o.statusLabel);
    orderWise.cell(oRow, 10).number(o.amount);
    orderWise.cell(oRow, 11).number(o.advance);
    orderWise.cell(oRow, 12).number(o.balance);
    orderWise.cell(oRow, 13).string(o.deliveryDateText);
    orderWise.cell(oRow, 14).string(o.deliveryType);
    oRow += 1;
  });

  return wb;
}

async function main() {
  ensureDir(OUT_DIR);

  await mongoose.connect(config.dbString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  });

  const db = mongoose.connection.db;
  const branchMap = await fetchBranchMap(db);
  const orderRows = await fetchOrders(db, branchMap);

  if (!orderRows.length) {
    throw new Error('No orders data found');
  }

  const aggregates = buildAggregates(orderRows);
  const generatedAt = new Date().toISOString();
  const wb = buildWorkbook({ generatedAt, orderRows, aggregates });

  await new Promise((resolve, reject) => {
    wb.write(OUT_FILE, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

  console.log(`Excel generated: ${OUT_FILE}`);
  console.log(`Orders: ${orderRows.length}`);
  console.log(`Months: ${aggregates.monthlyRows.length}`);
  console.log(`Branches in data: ${aggregates.branchTotalRows.length}`);
}

main()
  .catch((err) => {
    console.error('EXCEL_REPORT_ERROR:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  });
