import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/connect.js';
import Member from '../../../../lib/models/users.js';
import Invoice from '../../../../lib/models/invoices.js';
import Items from '../../../../lib/models/Items.js';

export async function GET(req, { params }) {
    try {
        await connectToDatabase();
        const { customerId } = await params;
        const member = await Member.findOne({ customerId }).lean();

        if (!member) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const invoices = await Invoice.find({ user: member._id })
            .sort({ issueDate: -1 })
            .lean();

        return NextResponse.json({ ...member, invoices }, { status: 200 });
    }
    catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        await connectToDatabase();
        const { customerId } = await params;
        const { itemPrices = [] } = await req.json();
        const validItemPrices = await normalizeItemPrices(itemPrices);
        const member = await Member.findOneAndUpdate(
            { customerId },
            { $set: { itemPrices: validItemPrices } },
            { new: true, runValidators: true }
        ).lean();
        if (!member) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        return NextResponse.json(member, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Unable to update customer prices' }, { status: 400 });
    }
}

async function normalizeItemPrices(itemPrices) {
    const entries = Array.isArray(itemPrices) ? itemPrices : [];
    const validEntries = entries.filter((entry) => entry?.item && Number.isFinite(Number(entry.price)) && Number(entry.price) >= 0);
    const catalogItems = await Items.find({ _id: { $in: validEntries.map((entry) => entry.item) }, isActive: true }).select('_id').lean();
    const validIds = new Set(catalogItems.map((item) => String(item._id)));
    return validEntries.filter((entry) => validIds.has(String(entry.item))).map((entry) => ({ item: entry.item, price: Number(entry.price) }));
}