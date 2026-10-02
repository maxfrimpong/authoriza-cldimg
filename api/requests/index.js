
const { connectDB } = require('../lib/db');

module.exports = async function (context, req) {
    let client;
    try {
        client = await connectDB();

        if (req.method === 'GET') {
            // In a real app, you might want pagination here
            const result = await client.query('SELECT * FROM requests ORDER BY created_at DESC');
            const requests = result.rows.map(r => ({
                id: r.id,
                requesterId: r.requester_id,
                requesterName: r.requester_name,
                department: r.department,
                position: r.position,
                vendorName: r.vendor_name,
                vendorTin: r.vendor_tin,
                paymentDetails: r.payment_details,
                amount: parseFloat(r.amount),
                fullRequestedAmount: parseFloat(r.full_requested_amount || 0),
                currency: r.currency,
                billingProject: r.billing_project,
                requestSubject: r.request_subject,
                description: r.description,
                billingItems: r.billing_items || [],
                withholdingTaxPercentage: parseFloat(r.withholding_tax_percentage || 0),
                otherWithholdingTaxPercentage: parseFloat(r.other_withholding_tax_percentage || 0),
                partPaymentPercentage: parseFloat(r.part_payment_percentage || 100),
                files: r.files || [],
                supervisorId: r.supervisor_id,
                authorizerId: r.authorizer_id,
                approverId: r.approver_id,
                status: r.status,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                remarks: r.remarks,
                signOff: r.sign_off,
                requesterSignature: r.requester_signature,
                supervisorSignature: r.supervisor_signature,
                authorizerSignature: r.authorizer_signature,
                approverSignature: r.approver_signature,
                editCount: r.edit_count || 0
            }));
            context.res = { body: requests };
        } 
        else if (req.method === 'POST') {
            const r = req.body;
            const query = `
                INSERT INTO requests (
                    id, requester_id, requester_name, department, position, vendor_name, 
                    payment_details, amount, currency, billing_project, request_subject, 
                    description, billing_items, withholding_tax_percentage, files, 
                    authorizer_id, status, created_at, updated_at, sign_off, edit_count,
                    vendor_tin, requester_signature, supervisor_id, full_requested_amount,
                    other_withholding_tax_percentage, part_payment_percentage
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
                RETURNING *
            `;
            const values = [
                r.id, r.requesterId, r.requesterName, r.department, r.position, r.vendorName,
                r.paymentDetails, r.amount, r.currency, r.billingProject, r.requestSubject,
                r.description, JSON.stringify(r.billingItems), r.withholdingTaxPercentage, JSON.stringify(r.files),
                r.authorizerId, r.status, r.createdAt, r.updatedAt, r.signOff, r.editCount,
                r.vendorTin, r.requesterSignature, r.supervisorId, r.fullRequestedAmount,
                r.otherWithholdingTaxPercentage, r.partPaymentPercentage
            ];
            const result = await client.query(query, values);
            context.res = { body: r }; // Return the body sent to keep UI optimistic update simpler
        } 
        else if (req.method === 'PUT') {
            const r = req.body;
            // This handles both full edits and status updates
            const query = `
                UPDATE requests 
                SET 
                    vendor_name=COALESCE($1, vendor_name),
                    amount=COALESCE($2, amount),
                    currency=COALESCE($3, currency),
                    billing_project=COALESCE($4, billing_project),
                    request_subject=COALESCE($5, request_subject),
                    description=COALESCE($6, description),
                    billing_items=COALESCE($7, billing_items),
                    files=COALESCE($8, files),
                    status=COALESCE($9, status),
                    remarks=COALESCE($10, remarks),
                    approver_id=COALESCE($11, approver_id),
                    updated_at=$12,
                    edit_count=COALESCE($13, edit_count),
                    payment_details=COALESCE($14, payment_details),
                    vendor_tin=COALESCE($16, vendor_tin),
                    requester_signature=COALESCE($17, requester_signature),
                    supervisor_signature=COALESCE($18, supervisor_signature),
                    authorizer_signature=COALESCE($19, authorizer_signature),
                    approver_signature=COALESCE($20, approver_signature),
                    supervisor_id=COALESCE($21, supervisor_id),
                    full_requested_amount=COALESCE($22, full_requested_amount),
                    other_withholding_tax_percentage=COALESCE($23, other_withholding_tax_percentage),
                    part_payment_percentage=COALESCE($24, part_payment_percentage)
                WHERE id=$15
            `;
            // Using COALESCE allows partial updates
            const values = [
                r.vendorName, r.amount, r.currency, r.billingProject, r.requestSubject,
                r.description, r.billingItems ? JSON.stringify(r.billingItems) : null, 
                r.files ? JSON.stringify(r.files) : null,
                r.status, r.remarks, r.approverId, new Date().toISOString(), r.editCount,
                r.paymentDetails,
                r.id,
                r.vendorTin,
                r.requesterSignature,
                r.supervisorSignature,
                r.authorizerSignature,
                r.approverSignature,
                r.supervisorId,
                r.fullRequestedAmount,
                r.otherWithholdingTaxPercentage,
                r.partPaymentPercentage
            ];
            await client.query(query, values);
            context.res = { body: { ...r, updatedAt: new Date().toISOString() } };
        }
    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: error.message };
    } finally {
        if (client) await client.end();
    }
};
