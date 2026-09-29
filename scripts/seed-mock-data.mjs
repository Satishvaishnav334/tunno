import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) { const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ''); }
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from .env');

const { default: Item } = await import('../src/lib/models/Items.js');
const { default: User } = await import('../src/lib/models/users.js');
const { default: Invoice } = await import('../src/lib/models/invoices.js');

const services = [
  ['London Same-Day Delivery', 18, 20], ['UK Next-Day Parcel', 9.5, 20], ['Economy 2-3 Day Parcel', 6.75, 20], ['Oversized Parcel Handling', 24, 20], ['Weekend Delivery Upgrade', 12.5, 20],
  ['Northern Ireland Delivery', 16.5, 20], ['Scottish Highlands Delivery', 19.75, 20], ['London Zone 1 Express', 14, 20], ['Manchester City Sprint', 13.5, 20], ['Birmingham Next-Day Parcel', 10.5, 20],
  ['Cardiff Next-Day Parcel', 11.25, 20], ['Bristol Same-Day Delivery', 15.5, 20], ['Leeds Economy Parcel', 8.25, 20], ['Liverpool Next-Day Parcel', 10.25, 20], ['Glasgow Priority Parcel', 17.5, 20],
  ['Fragile Parcel Handling', 8.5, 20], ['Return Collection Service', 7.25, 20], ['Proof of Delivery', 2.5, 20], ['Multi-Parcel Consignment', 5.75, 20], ['Saturday Collection', 11, 20],
].map(([name, defaultPrice, taxRate]) => ({ name, defaultPrice, taxRate }));

const customerSeeds = [
  ['Hannah Williams', 'hannah.williams@northstarretail.co.uk', 'London', 'Greater London', 'SE1 1LB', '14 Borough High Street'],
  ['Oliver Bennett', 'oliver.bennett@oakandstone.co.uk', 'Manchester', 'Greater Manchester', 'M3 2BY', '38 Deansgate'],
  ['Amelia Fraser', 'amelia.fraser@caltonhome.co.uk', 'Edinburgh', 'City of Edinburgh', 'EH6 5AA', '22 Leith Walk'],
  ['George Taylor', 'george.taylor@westfieldgoods.co.uk', 'Birmingham', 'West Midlands', 'B1 1TB', '74 Colmore Row'],
  ['Isla Morgan', 'isla.morgan@harboursupply.co.uk', 'Bristol', 'Bristol', 'BS1 4QA', '16 King Street'],
  ['Arthur Davies', 'arthur.davies@cambriantrade.co.uk', 'Cardiff', 'South Glamorgan', 'CF10 1EP', '9 St Mary Street'],
  ['Emily Wilson', 'emily.wilson@tynecommerce.co.uk', 'Newcastle', 'Tyne and Wear', 'NE1 1EE', '41 Grey Street'],
  ['Noah Evans', 'noah.evans@merseyworks.co.uk', 'Liverpool', 'Merseyside', 'L1 1JN', '27 Castle Street'],
  ['Grace Thomas', 'grace.thomas@yorkshireliving.co.uk', 'Leeds', 'West Yorkshire', 'LS1 5AB', '12 Park Row'],
  ['Harry Roberts', 'harry.roberts@wessexstores.co.uk', 'Southampton', 'Hampshire', 'SO14 3BQ', '8 Above Bar Street'],
  ['Freya Johnson', 'freya.johnson@essexmarket.co.uk', 'Colchester', 'Essex', 'CO1 1XJ', '19 High Street'],
  ['Jack Hughes', 'jack.hughes@nottinghamtrade.co.uk', 'Nottingham', 'Nottinghamshire', 'NG1 3QN', '55 Wheeler Gate'],
  ['Poppy Lewis', 'poppy.lewis@cornwallhome.co.uk', 'Plymouth', 'Devon', 'PL1 2AD', '6 Royal Parade'],
  ['Charlie Walker', 'charlie.walker@kentgoods.co.uk', 'Canterbury', 'Kent', 'CT1 2TX', '31 Burgate'],
  ['Ella Robinson', 'ella.robinson@oxfordmakers.co.uk', 'Oxford', 'Oxfordshire', 'OX1 1BP', '23 George Street'],
  ['Leo Allen', 'leo.allen@cambridgeparcel.co.uk', 'Cambridge', 'Cambridgeshire', 'CB2 3AR', '11 Regent Street'],
  ['Sophie Wright', 'sophie.wright@norwichcollective.co.uk', 'Norwich', 'Norfolk', 'NR2 1DR', '48 St Benedicts Street'],
  ['Oscar Scott', 'oscar.scott@sheffieldstock.co.uk', 'Sheffield', 'South Yorkshire', 'S1 2BJ', '20 Leopold Street'],
  ['Mia Green', 'mia.green@readingretail.co.uk', 'Reading', 'Berkshire', 'RG1 1TG', '15 Broad Street'],
  ['Thomas Baker', 'thomas.baker@brightonbox.co.uk', 'Brighton', 'East Sussex', 'BN1 1EE', '29 North Street'],
].map(([name, email, city, state, postalCode, addressLine], index) => ({ customerId: `CUST-MOCK-${String(index + 1).padStart(2, '0')}`, name, email, address: { fullName: name, mobile: `+44 7${String(400000000 + index * 371923).slice(0, 9)}`, addressLine, city, state, postalCode, country: 'United Kingdom' } }));

await mongoose.connect(process.env.MONGODB_URI);
const serviceDocs = [];
for (const service of services) serviceDocs.push(await Item.findOneAndUpdate({ name: service.name }, { $set: { ...service, isActive: true } }, { upsert: true, new: true, setDefaultsOnInsert: true }));

const customers = [];
for (const [index, seed] of customerSeeds.entries()) {
  const itemPrices = serviceDocs.map((service, serviceIndex) => ({ item: service._id, price: Number((service.defaultPrice * (0.9 + (index % 5) * 0.04) + (serviceIndex === index % 4 ? 1.25 : 0)).toFixed(2)) }));
  customers.push(await User.findOneAndUpdate({ email: seed.email }, { $set: { customerId: seed.customerId, name: seed.name, addresses: [seed.address], itemPrices } }, { upsert: true, new: true, setDefaultsOnInsert: true }));
}

const statuses = ['paid', 'sent', 'overdue', 'draft'];
for (let index = 0; index < 80; index += 1) {
  const customer = customers[index % customers.length];
  const service = serviceDocs[(index * 3) % serviceDocs.length];
  const quantity = (index % 9) + 1;
  const customPrice = customer.itemPrices.find((entry) => String(entry.item) === String(service._id))?.price ?? service.defaultPrice;
  const amount = Number((customPrice * quantity).toFixed(2));
  const taxTotal = Number((amount * service.taxRate / 100).toFixed(2));
  const issueDate = new Date(Date.now() - (index + 2) * 86400000);
  const dueDate = new Date(issueDate.getTime() + (index % 3 === 0 ? 7 : 14) * 86400000);
  await Invoice.findOneAndUpdate({ invoiceNumber: `PF-MOCK-${String(index + 1).padStart(4, '0')}` }, { $set: { invoiceNumber: `PF-MOCK-${String(index + 1).padStart(4, '0')}`, user: customer._id, customerName: customer.name, customerEmail: customer.email, billingAddress: customer.addresses[0], items: [{ item: service._id, name: service.name, description: service.name, quantity, unitPrice: customPrice, taxRate: service.taxRate, amount }], subtotal: amount, taxTotal, discount: 0, total: Number((amount + taxTotal).toFixed(2)), currency: 'GBP', issueDate, dueDate, status: statuses[index % statuses.length], paymentMethod: index % 2 ? 'bank_transfer' : 'card', notes: 'Mock ParcelFlow delivery-service invoice.' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

await Invoice.updateMany({ currency: { $ne: 'GBP' } }, { $set: { currency: 'GBP' } });
console.log(`Seeded ${serviceDocs.length} UK delivery services, ${customers.length} customers, and 80 invoices.`);
await mongoose.disconnect();