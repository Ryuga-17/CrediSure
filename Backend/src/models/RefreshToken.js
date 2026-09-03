const mongoose = require("mongoose");

const RefreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
  expires: { type: Date, required: true },
  createdByIp: { type: String },
  revoked: { type: Date },
  revokedByIp: { type: String },
  replacedByToken: { type: String },
}, { timestamps: true });

RefreshTokenSchema.virtual("isExpired").get(function () {
  return Date.now() >= this.expires;
});

RefreshTokenSchema.virtual("isActive").get(function () {
  return !this.revoked && !this.isExpired;
});

module.exports = mongoose.model("RefreshToken", RefreshTokenSchema);
