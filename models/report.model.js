import mongoose from "mongoose";

const reportHistorySchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["OPEN", "RESOLVED", "REJECTED"], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false, timestamps: false }
);

const reportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["thread", "comment", "user"], required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true },
    details: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["OPEN", "RESOLVED", "REJECTED"], default: "OPEN", index: true },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    handledAt: { type: Date },
    history: { type: [reportHistorySchema], default: [] },
  },
  { timestamps: true }
);

reportSchema.index({ type: 1, status: 1, createdAt: -1 });

export const Report = mongoose.model("Report", reportSchema);
