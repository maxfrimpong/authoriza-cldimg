
const { connectDB } = require('../../lib/db');

module.exports = async function (context, req) {
    if (req.method !== 'PUT') return { status: 405 };

    const { senderId, receiverId } = req.body;
    let client;
    try {
        client = await connectDB();
        const query = `
            UPDATE messages 
            SET is_read = TRUE 
            WHERE sender_id = $1 AND receiver_id = $2
        `;
        await client.query(query, [senderId, receiverId]);
        context.res = { status: 200 };
    } catch (error) {
        context.res = { status: 500, body: error.message };
    } finally {
        if (client) await client.end();
    }
};
