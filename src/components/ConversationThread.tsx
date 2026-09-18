type Message = {
  id: string;
  direction: string;
  sender: string;
  body: string;
  created_at: string;
};

export function ConversationThread({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 py-6 text-center text-sm text-zinc-400">
        No messages yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3.5">
      {messages.map((message) => {
        const isOutbound = message.direction === "outbound";
        return (
          <li key={message.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${isOutbound ? "items-end" : "items-start"} flex flex-col`}>
              <p
                className={`px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400 ${
                  isOutbound ? "text-right" : "text-left"
                }`}
              >
                {message.sender === "lead" ? "Lead" : message.sender === "ai" ? "AI" : "You"} ·{" "}
                {new Date(message.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p
                className={`mt-1 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isOutbound
                    ? "rounded-tr-sm bg-ink text-white"
                    : "rounded-tl-sm border border-zinc-100 bg-zinc-50 text-zinc-800"
                }`}
              >
                {message.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
