import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/connect.js';
import Invoices from '../../../lib/models/invoices.js';
import Users from '../../../lib/models/users.js';
import Items from '../../../lib/models/Items.js';
export async function GET() {
    try{
        await connectToDatabase();
       
        const data = await Invoices.find({}).populate('user', 'customerId name email').sort({ issueDate: -1 })
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
        const { user, invoiceNumber, dueDate, status = 'draft', currency = 'INR', paymentMethod, notes, items = [] } = body;

        if (!user || !invoiceNumber || !dueDate || !items.length) {
            return NextResponse.json({ error: 'Customer, invoice number, due date, and at least one item are required' }, { status: 400 });
        }

        const customer = await Users.findById(user).lean();
        if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        if (!customer.addresses?.[0]) return NextResponse.json({ error: 'Customer must have a billing address before invoicing' }, { status: 400 });

        const itemIds = items.map((line) => line.item);
        if (new Set(itemIds.map(String)).size !== itemIds.length) {
            return NextResponse.json({ error: 'Each item can only appear once on an invoice' }, { status: 400 });
        }
        const catalogItems = await Items.find({ _id: { $in: itemIds }, isActive: true }).lean();
        if (catalogItems.length !== itemIds.length) {
            return NextResponse.json({ error: 'Every invoice item must be an active catalog item' }, { status: 400 });
        }

        const savedPrices = new Map((customer.itemPrices || []).map((entry) => [String(entry.item), Number(entry.price)]));
        const invoiceItems = items.map((line) => {
            const catalogItem = catalogItems.find((item) => String(item._id) === String(line.item));
            const quantity = Number(line.quantity);
            const unitPrice = Number(line.unitPrice ?? savedPrices.get(String(catalogItem._id)) ?? catalogItem.defaultPrice);
            const taxRate = Number(line.taxRate ?? catalogItem.taxRate ?? 0);
            if (!Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new Error('Invoice item quantity, price, and tax must be valid numbers');
            return { item: catalogItem._id, name: catalogItem.name, description: catalogItem.name, quantity, unitPrice, taxRate, amount: quantity * unitPrice };
        });

        const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
        const taxTotal = invoiceItems.reduce((sum, item) => sum + (item.amount * item.taxRate) / 100, 0);
        const discount = Number(body.discount || 0);
        if (!Number.isFinite(discount) || discount < 0 || discount > subtotal + taxTotal) {
            return NextResponse.json({ error: 'Discount must be between zero and the invoice total' }, { status: 400 });
        }
        const invoice = await Invoices.create({ invoiceNumber: invoiceNumber.trim(), user, customerName: customer.name, customerEmail: customer.email, billingAddress: customer.addresses?.[0], items: invoiceItems, subtotal, taxTotal, discount, total: subtotal + taxTotal - discount, currency: currency.toUpperCase(), dueDate, status, paymentMethod, notes });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error.code === 11000 ? 'Invoice number already exists' : error.message || 'Unable to create invoice' }, { status: error.code === 11000 ? 409 : 400 });
    }
}