
const { connectDB } = require('../lib/db');

module.exports = async function (context, req) {
    let client;
    try {
        client = await connectDB();

        if (req.method === 'GET') {
            const result = await client.query('SELECT * FROM messages ORDER BY timestamp ASC');
            const messages = result.rows.map(m => ({
                id: m.id,
                senderId: m.sender_id,
                receiverId: m.receiver_id,
                content: m.content,
                timestamp: m.timestamp,
                isRead: m.is_read
            }));
            context.res = { body: messages };
        } 
        else if (req.method === 'POST') {
            const m = req.body;
            const query = `
                INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, is_read)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            const values = [m.id, m.senderId, m.receiverId, m.content, m.timestamp, m.isRead];
            await client.query(query, values);
            context.res = { body: m };
        }
    } catch (error) {
        context.res = { status: 500, body: error.message };
    } finally {
        if (client) await client.end();
    }
};
