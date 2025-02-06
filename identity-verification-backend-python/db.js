const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres', // Change if your username is different
    host: 'localhost',
    database: 'identity_verification', // Use your database name here
    password: 'eashu777', // Your PostgreSQL password
    port: 5432, // Default PostgreSQL port
});

pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database');
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};

// Test database connection
(async () => {
    try {
        const res = await pool.query('SELECT NOW()'); // Test database connection
        console.log('Database connected:', res.rows);
    } catch (err) {
        console.error('Database connection error:', err.message);
    }   
})();
