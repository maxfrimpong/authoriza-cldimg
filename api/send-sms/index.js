
module.exports = async function (context, req) {
    if (req.method !== 'POST') {
        context.res = { status: 405, body: "Method Not Allowed" };
        return;
    }

    // Twilio integration removed. Returning success mock.
    context.res = { status: 200, body: { message: "SMS integration has been removed." } };
};
