export const CHAT_EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😎", "🤔", "😮", "😢", "😭", "😤", "🙄", "😴"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️", "🤞", "👋", "🫡", "🤷", "🤦"],
  },
  {
    label: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "✨", "🔥", "⭐", "🎉", "✅", "❌", "⚠️", "💡"],
  },
  {
    label: "Work",
    emojis: ["📎", "📁", "📂", "📝", "📅", "⏰", "🔔", "💬", "📧", "🚀", "🛠️", "🐛", "✔️", "📌", "🔗"],
  },
];

export const CHAT_EMOJIS_FLAT = CHAT_EMOJI_GROUPS.flatMap((g) => g.emojis);
