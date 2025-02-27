const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool(process.env.DATABASE_URL + '?ssl={"rejectUnauthorized":true}');

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection error:", err);
  } else {
    console.log("✅ MySQL Database connected successfully!");
    connection.release();
  }
});

module.exports = pool.promise();
