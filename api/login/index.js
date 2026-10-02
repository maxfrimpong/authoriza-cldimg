
const { connectDB } = require('../lib/db');

module.exports = async function (context, req) {
    if (req.method !== 'POST') {
        context.res = { status: 405, body: "Method Not Allowed" };
        return;
    }

    const { email, password } = req.body;
    let client;

    try {
        client = await connectDB();
        const query = 'SELECT * FROM users WHERE lower(email) = lower($1) AND password = $2';
        const result = await client.query(query, [email, password]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Normalize data structures (db uses snake_case, app uses camelCase)
            const appUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                department: user.department,
                position: user.position,
                roles: user.roles || [],
                profilePictureUrl: user.profile_picture_url
            };
            context.res = { status: 200, body: appUser };
        } else {
            context.res = { status: 401, body: "Invalid credentials" };
        }
    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: "Database error" };
    } finally {
        if (client) await client.end();
    }
};
