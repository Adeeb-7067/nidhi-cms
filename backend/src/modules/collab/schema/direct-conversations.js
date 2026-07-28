import mongoose, { Schema } from "mongoose";

const directConversationSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    /** Sorted ascending — used for listing a user's conversations. */
    participantIds: {
      type: [Number],
      required: true,
      validate: {
        validator: (ids) => Array.isArray(ids) && ids.length === 2 && ids[0] < ids[1],
        message: "participantIds must contain exactly two distinct user ids in ascending order",
      },
    },
    /** Stable "low:high" key — unique per participant pair (do not unique-index the array). */
    pairKey: { type: String, unique: true, required: true, index: true },
  },
  { timestamps: true },
);

directConversationSchema.index({ participantIds: 1, updatedAt: -1 });

const DirectConversations =
  mongoose.models.DirectConversations ||
  mongoose.model("DirectConversations", directConversationSchema);

const directConversationsTable = DirectConversations;

export { DirectConversations, directConversationsTable };
