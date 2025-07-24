const mariadb = require("mariadb");
const dotenv = require("dotenv");

dotenv.config();

async function run() {
  console.log("Starting direct SQL migration...");

  // Create connection pool
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
    // Get connection from pool
    conn = await pool.getConnection();
    console.log("Connected to MariaDB database");

    // 1. Update User table
    console.log("Updating users table...");

    // Check if username column exists
    const userColumns = await conn.query(
      `SHOW COLUMNS FROM users LIKE 'username'`
    );
    if (userColumns.length === 0) {
      // Add username column
      await conn.query(`ALTER TABLE users ADD COLUMN username VARCHAR(255)`);
      console.log("Added username column to users table");

      // Check if email column exists
      const emailColumns = await conn.query(
        `SHOW COLUMNS FROM users LIKE 'email'`
      );
      if (emailColumns.length > 0) {
        // Copy email data to username
        await conn.query(
          `UPDATE users SET username = email WHERE username IS NULL OR username = ''`
        );
        console.log("Copied data from email to username");
      }

      // Make username required
      await conn.query(
        `ALTER TABLE users MODIFY username VARCHAR(255) NOT NULL`
      );
      console.log("Made username column required");

      // Add unique constraint
      await conn.query(`ALTER TABLE users ADD UNIQUE (username)`);
      console.log("Added unique constraint to username");
    }

    // Check and remove email column
    const emailCheck = await conn.query(`SHOW COLUMNS FROM users LIKE 'email'`);
    if (emailCheck.length > 0) {
      await conn.query(`ALTER TABLE users DROP COLUMN email`);
      console.log("Removed email column from users table");
    }

    // Check and remove full_name column
    const fullNameCheck = await conn.query(
      `SHOW COLUMNS FROM users LIKE 'full_name'`
    );
    if (fullNameCheck.length > 0) {
      await conn.query(`ALTER TABLE users DROP COLUMN full_name`);
      console.log("Removed full_name column from users table");
    }

    // 2. Update Client table
    console.log("Updating clients table...");

    // Check and remove contact_email column
    const contactEmailCheck = await conn.query(
      `SHOW COLUMNS FROM clients LIKE 'contact_email'`
    );
    if (contactEmailCheck.length > 0) {
      await conn.query(`ALTER TABLE clients DROP COLUMN contact_email`);
      console.log("Removed contact_email column from clients table");
    }

    // Check and remove contact_phone column
    const contactPhoneCheck = await conn.query(
      `SHOW COLUMNS FROM clients LIKE 'contact_phone'`
    );
    if (contactPhoneCheck.length > 0) {
      await conn.query(`ALTER TABLE clients DROP COLUMN contact_phone`);
      console.log("Removed contact_phone column from clients table");
    }

    // 3. Update AgentProfile table
    console.log("Updating agent_profiles table...");

    // List of columns to remove
    const agentProfileColumns = ["email", "phone", "address", "contact_person"];

    for (const column of agentProfileColumns) {
      const columnCheck = await conn.query(
        `SHOW COLUMNS FROM agent_profiles LIKE '${column}'`
      );
      if (columnCheck.length > 0) {
        await conn.query(`ALTER TABLE agent_profiles DROP COLUMN ${column}`);
        console.log(`Removed ${column} column from agent_profiles table`);
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    if (conn) {
      conn.release(); // Release connection back to pool
    }
    if (pool) {
      pool.end(); // End the pool
    }
    console.log("Database connection closed");
  }
}

// Run the script
run().catch(console.error);
