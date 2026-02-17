const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();
 
const CONNECTION_STRING = process.env.CONNECTION_STRING;
if (!CONNECTION_STRING) {
  console.error('CONNECTION_STRING not set. Add it to migration/.env');
  process.exit(1);
}
 
async function run() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
 
  const dir = __dirname;
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && f.match(/^\d+_.*\.sql$/))
    .sort();
 
  for (const file of files) {
    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running ${file}...`);
    await client.query(sql);
    console.log(`  Done.`);
  }
 
  await client.end();
  console.log('Migrations complete.');
}
 
run().catch((err) => {
  console.error(err);
  process.exit(1);
});