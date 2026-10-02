
const { Client } = require('pg');

// Create a new client for each request (Azure Functions are stateless)
// In production with high load, you might want to use a Pool.
const connectDB = async () => {
    // Ensure DATABASE_URL is set in Azure Configuration
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Azure Database for PostgreSQL
    });

    await client.connect();
    return client;
};

module.exports = { connectDB };
