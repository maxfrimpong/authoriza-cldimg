
const { connectDB } = require('../lib/db');

module.exports = async function (context, req) {
    let client;
    try {
        client = await connectDB();
        
        // We'll store system lists as a single JSON row in a 'config' table for simplicity,
        // or just return default structure if table empty.
        // Assumes a table: CREATE TABLE system_config (id INT PRIMARY KEY, data JSONB);

        if (req.method === 'GET') {
            // Check if config exists
            const result = await client.query('SELECT data FROM system_config WHERE id = 1');
            if (result.rows.length > 0) {
                context.res = { body: result.rows[0].data };
            } else {
                context.res = { status: 404, body: "Not found" };
            }
        } 
        else if (req.method === 'PUT') {
            const lists = req.body;
            const query = `
                INSERT INTO system_config (id, data) VALUES (1, $1)
                ON CONFLICT (id) DO UPDATE SET data = $1
            `;
            await client.query(query, [JSON.stringify(lists)]);
            context.res = { body: lists };
        }
    } catch (error) {
        // Table might not exist yet, or generic error
        context.log.error(error);
        context.res = { status: 500, body: error.message };
    } finally {
        if (client) await client.end();
    }
};
