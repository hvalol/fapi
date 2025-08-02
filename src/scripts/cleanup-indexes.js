// src/scripts/cleanup-indexes.js
const mariadb = require("mariadb");
require("dotenv").config();

async function cleanupIndexes() {
  const pool = mariadb.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  let conn;
  try {
    conn = await pool.getConnection();
    console.log("Connected to database");

    // Get all indexes on the users table
    const indexes = await conn.query(`SHOW INDEX FROM users`);

    // Group indexes by name
    const indexNames = new Set();
    const duplicateIndexes = [];

    indexes.forEach((idx) => {
      if (idx.Key_name !== "PRIMARY") {
        if (indexNames.has(idx.Key_name)) {
          duplicateIndexes.push(idx.Key_name);
        } else {
          indexNames.add(idx.Key_name);
        }
      }
    });

    console.log(`Found ${indexNames.size} non-primary indexes on users table`);

    // Keep only the most important indexes
    const indexesToKeep = ["users_username_unique", "users_client_id_foreign"];
    const indexesToRemove = [...indexNames].filter(
      (name) => !indexesToKeep.includes(name)
    );

    console.log(`Will keep indexes: ${indexesToKeep.join(", ")}`);
    console.log(`Will remove indexes: ${indexesToRemove.join(", ")}`);

    // Remove redundant indexes
    for (const indexName of indexesToRemove) {
      try {
        console.log(`Dropping index ${indexName}...`);
        await conn.query(`ALTER TABLE users DROP INDEX ${indexName}`);
        console.log(`Dropped index ${indexName}`);
      } catch (err) {
        console.error(`Error dropping index ${indexName}:`, err.message);
      }
    }

    // Ensure username unique constraint exists
    try {
      await conn
        .query(
          `
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE table_schema = DATABASE() 
        AND table_name = 'users' 
        AND index_name = 'users_username_unique'
      `
        )
        .then((result) => {
          if (result[0]["COUNT(*)"] === 0) {
            return conn.query(
              `ALTER TABLE users ADD UNIQUE INDEX users_username_unique (username)`
            );
          } else {
            console.log("Username unique constraint already exists");
            return Promise.resolve();
          }
        });
    } catch (err) {
      console.error("Error ensuring username unique constraint:", err.message);
    }

    console.log("Index cleanup completed");
  } catch (error) {
    console.error("Error during index cleanup:", error);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

cleanupIndexes().catch(console.error);
