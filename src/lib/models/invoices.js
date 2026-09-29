import mongoose, { Schema } from "mongoose";

const AddressSchema = new Schema(
	{
		fullName: { type: String, required: true, trim: true },
		mobile: { type: String, required: true, trim: true },
		addressLine: { type: String, required: true, trim: true },
		city: { type: String, required: true, trim: true },
		state: { type: String, required: true, trim: true },
		postalCode: { type: String, required: true, trim: true },
		country: { type: String, required: true, default: "India", trim: true },
	},
	{ _id: false }
);

const ItemSchema = new Schema(
	{
		item: {
			type: Schema.Types.ObjectId,
			ref: "Item",
			required: true,
		},
		name: { type: String, required: true, trim: true },
		description: { type: String, required: true, trim: true },
		quantity: { type: Number, required: true, min: 1 },
		unitPrice: { type: Number, required: true, min: 0 },
		taxRate: { type: Number, default: 0, min: 0, max: 100 },
		amount: { type: Number, required: true, min: 0 },
	},
	{ _id: true }
);

const InvoiceSchema = new Schema(
	{
		invoiceNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		customerName: { type: String, required: true, trim: true },
		customerEmail: { type: String, required: true, trim: true, lowercase: true },
		billingAddress: { type: AddressSchema, required: true },
		shippingAddress: { type: AddressSchema },
		items: {
			type: [ItemSchema],
			required: true,
			validate: {
				validator: (items) => items.length > 0,
				message: "An invoice must contain at least one item",
			},
		},
		subtotal: { type: Number, required: true, min: 0 },
		taxTotal: { type: Number, required: true, min: 0, default: 0 },
		discount: { type: Number, min: 0, default: 0 },
		total: { type: Number, required: true, min: 0 },
		currency: { type: String, required: true, default: "INR", uppercase: true },
		issueDate: { type: Date, required: true, default: Date.now },
		dueDate: { type: Date, required: true },
		status: {
			type: String,
			enum: ["draft", "sent", "paid", "overdue", "cancelled"],
			default: "draft",
		},
		paymentMethod: {
			type: String,
			enum: ["cash", "card", "bank_transfer", "upi", "other"],
		},
		notes: { type: String, trim: true },
	},
	{ timestamps: true }
);

InvoiceSchema.index({ user: 1, issueDate: -1 });

const Invoice =
	mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);

export default Invoice;
