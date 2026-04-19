const fs = require('fs');
const path = require('path');

const backendOrigin = process.argv[2];

if (!backendOrigin) {
  console.error('Usage: node scripts/prepare-separate-vercel.js <backend-origin>');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(backendOrigin);
} catch (err) {
  console.error(`Invalid backend origin: ${backendOrigin}`);
  process.exit(1);
}

const origin = parsed.origin;
const repoRoot = path.resolve(__dirname, '..');
const noopSocket = '{on:function(){},emit:function(){}}';

const targets = {
  orders1Js: path.join(repoRoot, 'frontends/orders1.theblackforestcakes.com/static/js/main.9a3d7ba7.chunk.js'),
  orders1Vercel: path.join(repoRoot, 'frontends/orders1.theblackforestcakes.com/vercel.json'),
  admin1Js: path.join(repoRoot, 'frontends/admin1.theblackforestcakes.com/static/js/main.c87df5a4.chunk.js'),
  admin1Vercel: path.join(repoRoot, 'frontends/admin1.theblackforestcakes.com/vercel.json'),
};

function backupFile(filePath) {
  const backupPath = `${filePath}.separate-backup`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }
}

function writeFile(filePath, content) {
  backupFile(filePath);
  fs.writeFileSync(filePath, content);
}

function replaceOrThrow(content, searchValue, replaceValue, label) {
  if (!content.includes(searchValue)) {
    throw new Error(`Expected pattern not found for ${label}`);
  }
  return content.replace(searchValue, replaceValue);
}

const proxyVercelConfig = JSON.stringify(
  {
    routes: [
      { src: '/v1/(.*)', dest: `${origin}/v1/$1` },
      { handle: 'filesystem' },
      { src: '/.*', dest: '/index.html' },
    ],
  },
  null,
  2,
) + '\n';

const orders1JsRaw = fs.readFileSync(targets.orders1Js, 'utf8');
let orders1Js = orders1JsRaw;
orders1Js = replaceOrThrow(
  orders1Js,
  'Ut=Mt()(D),',
  `Ut=${noopSocket},`,
  'orders1 socket client',
);
writeFile(targets.orders1Js, orders1Js);
writeFile(targets.orders1Vercel, proxyVercelConfig);

const admin1JsRaw = fs.readFileSync(targets.admin1Js, 'utf8');
let admin1Js = admin1JsRaw;
admin1Js = replaceOrThrow(
  admin1Js,
  'D="https://api2.theblackforestcakes.com/v1",k="https://api3.theblackforestcakes.com"',
  'D="/v1",k=""',
  'admin1 api/socket hosts',
);
admin1Js = replaceOrThrow(
  admin1Js,
  'be=ve()(k),',
  `be=${noopSocket},`,
  'admin1 tracking socket client',
);
admin1Js = replaceOrThrow(
  admin1Js,
  'lt=ve()(k),',
  `lt=${noopSocket},`,
  'admin1 live orders socket client',
);
writeFile(targets.admin1Js, admin1Js);
writeFile(targets.admin1Vercel, proxyVercelConfig);

console.log('Prepared separate Vercel frontend configs.');
console.log(`Backend proxy origin: ${origin}`);
console.log('Realtime socket clients were neutralized in the frontend snapshots.');
console.log('Backups were created with the .separate-backup suffix.');
