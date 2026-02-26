const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRE_URI,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;