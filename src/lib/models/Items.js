import mongoose, { Schema } from "mongoose";

const ItemSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		defaultPrice: { type: Number, required: true, min: 0 },
		taxRate: { type: Number, default: 0, min: 0, max: 100 },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

const cachedItemModel = mongoose.models.Item;
if (cachedItemModel?.schema.path("user")) {
	mongoose.deleteModel("Item");
}

const Item = mongoose.models.Item || mongoose.model("Item", ItemSchema);

export default Item;
