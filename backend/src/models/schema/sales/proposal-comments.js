import mongoose, { Schema } from "mongoose";

const proposalCommentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    proposalId: { type: Number, required: true, index: true },
    authorName: { type: String, required: true },
    authorType: { type: String, enum: ["client", "staff"], required: true },
    authorId: { type: Number, default: null },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

proposalCommentSchema.index({ proposalId: 1, createdAt: 1 });

const SalesProposalComments =
  mongoose.models.SalesProposalComments ||
  mongoose.model("SalesProposalComments", proposalCommentSchema);

export { SalesProposalComments };
