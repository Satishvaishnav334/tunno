import mongoose, { Schema } from "mongoose";

const AddressSchema = new Schema({
  fullName: { type: String, required: true },
  mobile: { type: String, required: true },
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, default: "United Kingdom" },
}, { _id: false });

const ItemPriceSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const UserSchema = new Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // e.g., "CUST-1001"
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    addresses: [AddressSchema],
    itemPrices: [ItemPriceSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual("invoices", {
  ref: "Invoice",
  localField: "_id",
  foreignField: "user",
});

const cachedUserModel = mongoose.models.User;
if (cachedUserModel && !cachedUserModel.schema.path("itemPrices")) {
  mongoose.deleteModel("User");
}

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
