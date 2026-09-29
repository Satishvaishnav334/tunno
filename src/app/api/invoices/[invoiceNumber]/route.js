import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/connect.js';
import Invoice from '../../../../lib/models/invoices.js';

export async function GET(req, { params }) {
    try {
        await connectToDatabase();
        const { invoiceNumber } = await params;
        const invoice = await Invoice.findOne({ invoiceNumber }).lean();

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(invoice, { status: 200 });
    }
    catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        await connectToDatabase();
        const { invoiceNumber } = await params;
        const { status } = await req.json();
        const allowedStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

        if (!allowedStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid invoice status' }, { status: 400 });
        }

        const invoice = await Invoice.findOneAndUpdate(
            { invoiceNumber },
            { $set: { status } },
            { new: true, runValidators: true }
        ).lean();

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        return NextResponse.json(invoice, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Unable to update invoice status' }, { status: 400 });
    }
}