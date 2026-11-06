const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expense_tracker_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 4000,
    decimalNumbers: true
};

// Create the connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Initializes the database and required tables if they do not exist.
 */
async function initializeDatabase() {
    try {
        // Step 1: Connect to MySQL root/server without selecting DB
        const serverConn = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port,
            connectTimeout: 4000
        });

        console.log('🔄 Checking database & tables setup...');
        await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await serverConn.end();

        // Step 2: Create required tables in the database
        const dbConn = await pool.getConnection();

        // TABLE 1: users
        await dbConn.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);

        // TABLE 2: categories
        await dbConn.query(`
            CREATE TABLE IF NOT EXISTS categories (
                category_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category_name VARCHAR(100) NOT NULL,
                category_type VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_categories_user FOREIGN KEY (user_id) 
                    REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        // TABLE 3: transactions
        await dbConn.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                transaction_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                description VARCHAR(255),
                transaction_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) 
                    REFERENCES users(user_id) ON DELETE CASCADE,
                CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) 
                    REFERENCES categories(category_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        // TABLE 4: budgets
        await dbConn.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                budget_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                monthly_limit DECIMAL(10,2) NOT NULL,
                month INT NOT NULL,
                year INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_user_month_year UNIQUE (user_id, month, year),
                CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) 
                    REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        dbConn.release();
        console.log('✅ MySQL Database and 4 Tables (users, categories, transactions, budgets) verified successfully.');
    } catch (err) {
        console.error('⚠️ Database connection / initialization note:', err.message);
        console.log('👉 Please ensure MySQL service is running with credentials configured in .env');
    }
}

module.exports = {
    pool,
    initializeDatabase
};
