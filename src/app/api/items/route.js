import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/connect.js';
import Items from '../../../lib/models/Items.js';

export async function GET() {
    try{
        await connectToDatabase();
       
        const data = await Items.find({})
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
        const { name, defaultPrice, taxRate = 0 } = body;

        if (!name || defaultPrice === undefined) {
            return NextResponse.json({ error: 'Name and default price are required' }, { status: 400 });
        }
        const item = await Items.create({ name: name.trim(), defaultPrice: Number(defaultPrice), taxRate: Number(taxRate) });
        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Unable to create item' }, { status: 400 });
    }
}