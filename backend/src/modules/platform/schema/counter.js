import mongoose, { Schema } from "mongoose";
const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model("Counter", CounterSchema);
async function getNextSequence(sequenceName) {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Atomically reserves `count` sequential IDs in one round-trip.
// Returns an array of `count` consecutive integers.
async function getNextSequenceRange(sequenceName, count) {
  if (count <= 1) return [await getNextSequence(sequenceName)];
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: count } },
    { new: true, upsert: true }
  );
  const last = counter.seq;
  return Array.from({ length: count }, (_, i) => last - count + 1 + i);
}

export {
  Counter,
  getNextSequence,
  getNextSequenceRange,
};
