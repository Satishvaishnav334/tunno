import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/connect.js';
import Users from '../../../lib/models/users.js';
import Items from '../../../lib/models/Items.js';

export async function GET() {
    try{
        await connectToDatabase();
       
        const data = await Users.find({})
        return NextResponse.json(data, { status: 200 });
    }
    catch(error){
        console.log(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectToDatabase();
        const body = await request.json();
        const { name, email, addresses = [], itemPrices = [] } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const existing = await Users.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 });
        }

        const validItemPrices = await normalizeItemPrices(itemPrices);
        const customerId = `CUST-${Date.now().toString().slice(-8)}`;
        const customer = await Users.create({
            customerId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            addresses: addresses.slice(0, 1),
            itemPrices: validItemPrices,
        });

        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error.code === 11000 ? 'Customer already exists' : 'Unable to create customer' }, { status: error.code === 11000 ? 409 : 400 });
    }
}

async function normalizeItemPrices(itemPrices) {
    const entries = Array.isArray(itemPrices) ? itemPrices : [];
    const validEntries = entries.filter((entry) => entry?.item && Number.isFinite(Number(entry.price)) && Number(entry.price) >= 0);
    const catalogItems = await Items.find({ _id: { $in: validEntries.map((entry) => entry.item) }, isActive: true }).select('_id').lean();
    const validIds = new Set(catalogItems.map((item) => String(item._id)));
    return validEntries.filter((entry) => validIds.has(String(entry.item))).map((entry) => ({ item: entry.item, price: Number(entry.price) }));
}

