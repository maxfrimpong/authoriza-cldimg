
const { connectDB } = require('../lib/db');

module.exports = async function (context, req) {
    let client;
    try {
        client = await connectDB();

        if (req.method === 'GET') {
            const result = await client.query('SELECT * FROM users ORDER BY name ASC');
            const users = result.rows.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                phoneNumber: u.phone_number,
                password: u.password,
                department: u.department,
                position: u.position,
                roles: u.roles || [],
                profilePictureUrl: u.profile_picture_url
            }));
            context.res = { body: users };
        } 
        else if (req.method === 'POST') {
            const u = req.body;
            const query = `
                INSERT INTO users (id, name, email, phone_number, password, department, position, roles, profile_picture_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            const values = [u.id, u.name, u.email, u.phoneNumber, u.password, u.department, u.position, JSON.stringify(u.roles), u.profilePictureUrl];
            const result = await client.query(query, values);
            // Map result back to camelCase for consistency
            const row = result.rows[0];
            context.res = { body: { ...u, phoneNumber: row.phone_number } };
        } 
        else if (req.method === 'PUT') {
            const u = req.body;
            // Build dynamic update query
            const query = `
                UPDATE users 
                SET name=$1, email=$2, department=$3, position=$4, roles=$5, profile_picture_url=$6, phone_number=$7, password=COALESCE(NULLIF($8, ''), password)
                WHERE id=$9
                RETURNING *
            `;
            // Note: password update logic checks if new password string is provided
            const values = [u.name, u.email, u.department, u.position, JSON.stringify(u.roles), u.profilePictureUrl, u.phoneNumber, u.password, u.id];
            const result = await client.query(query, values);
            const row = result.rows[0];
            context.res = { body: { ...u, phoneNumber: row.phone_number } };
        }
    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: error.message };
    } finally {
        if (client) await client.end();
    }
};
