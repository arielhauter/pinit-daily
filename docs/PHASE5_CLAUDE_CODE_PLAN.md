# Phase 5: Polish + Navigation + Error Handling — Claude Code Implementation Plan

> **Paste this entire file as the prompt to Claude Code.** Final polish phase.

---

## What We're Building

Polish and integration items that make the app production-ready for Mai's daily use:

1. **Navigation integration** — link to /chat from the home page and between all app sections
2. **Error handling** — graceful error messages in Thai for all tool failures
3. **Multi-item sale UX** — Claude's conversational multi-item flow is already working, but needs system prompt refinement
4. **Chat history reset** — button to clear conversation and start fresh
5. **Opus model switcher** — 🧠 Oracle button that uses Claude Opus for deep analysis
6. **Version info + audit trail** — track who did what

---

## Files to Create / Modify

```
app/chat/page.tsx                    # Navigation, clear chat, Opus toggle
app/page.tsx                         # Add link to /chat from home page
app/api/chat/route.ts                # Opus model switcher
lib/chat-system-prompt.ts            # Multi-item sale refinements, error handling instructions
components/chat/context-buttons.tsx  # Add 🧠 Oracle button, 🗑 clear button
```

---

## Part 1: Navigation Integration

### Add chat link to the home page (`app/page.tsx`)

The home page is the close-out system. Add a prominent link to the chat at the top or bottom:

```tsx
<a
  href="/chat"
  className="flex items-center justify-center gap-2 bg-sky-600 text-white rounded-xl px-6 py-3 text-lg font-medium active:bg-sky-700"
>
  🤖 น้องพินิจ — AI Chat
</a>
```

Place this near the top of the home page, above or below the close-out section. It should be visually prominent — this is now the primary daily tool.

### Add navigation between /chat and other pages

In `app/chat/page.tsx`, the header already has a "กลับ" (back) button that goes to `/`. Also add a link to the inventory page:

```tsx
<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
  <h1 className="text-lg font-medium text-white">น้องพินิจ 🤖</h1>
  <div className="flex gap-3">
    <button
      onClick={() => router.push('/inventory')}
      className="text-sm text-slate-400 hover:text-white"
    >
      📦 นับสต็อก
    </button>
    <button
      onClick={() => router.push('/')}
      className="text-sm text-slate-400 hover:text-white"
    >
      🌙 ปิดร้าน
    </button>
  </div>
</div>
```

### Add chat link to the inventory page

If `/inventory` has a header or navigation, add a link back to `/chat`:

```tsx
<a href="/chat" className="text-sm text-sky-400 hover:text-white">🤖 แชท</a>
```

---

## Part 2: Clear Chat Button

Add a way to reset the conversation. This is important because the message history grows and costs more tokens over time.

### In `app/chat/page.tsx`:

Use `setMessages` from `useChat` to clear the conversation:

```tsx
const { messages, input, handleInputChange, handleSubmit, append, isLoading, setMessages } =
  useChat({ api: "/api/chat" });

const handleClearChat = () => {
  setMessages([]);
};
```

### Add a clear button in the header:

```tsx
<button
  onClick={handleClearChat}
  className="text-sm text-slate-400 hover:text-white"
  title="เริ่มแชทใหม่"
>
  🗑
</button>
```

Or add it as a small button below the context buttons area.

---

## Part 3: Opus Model Switcher (🧠 Oracle Mode)

### How it works:

1. Add a `🧠 Oracle` toggle button in the header or context buttons area
2. When toggled ON, a flag is sent with each message to the API route
3. The API route uses `claude-opus-4-6` instead of `claude-sonnet-4-6` for that conversation
4. Visual indicator shows when Oracle mode is active (glowing border, different header color)

### Frontend — `app/chat/page.tsx`:

```tsx
const [oracleMode, setOracleMode] = useState(false);

const { messages, input, handleInputChange, handleSubmit, append, isLoading, setMessages } =
  useChat({
    api: "/api/chat",
    body: {
      oracleMode, // sent with every request
    },
  });
```

### Toggle button:

```tsx
<button
  onClick={() => setOracleMode(!oracleMode)}
  className={`text-sm px-3 py-1 rounded-full transition-colors ${
    oracleMode
      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
      : 'bg-slate-800 text-slate-400 hover:text-white'
  }`}
>
  🧠 {oracleMode ? 'Oracle ON' : 'Oracle'}
</button>
```

Place this in the header row, next to the navigation buttons.

### Visual indicator when Oracle mode is active:

Change the header background or add a subtle glow:
```tsx
<div className={`flex items-center justify-between px-4 py-3 border-b ${
  oracleMode ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700'
}`}>
```

### Backend — `app/api/chat/route.ts`:

```tsx
export async function POST(req: Request) {
  const { messages, oracleMode } = await req.json();

  const result = streamText({
    model: anthropic(oracleMode ? 'claude-opus-4-6' : 'claude-sonnet-4-6'),
    system: SYSTEM_PROMPT,
    messages,
    tools: chatTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

### System prompt addition:

```
ORACLE MODE:
When the user activates Oracle mode (🧠), you are running on a more powerful model.
Use this mode for:
- Deep analysis and complex reasoning
- Comparing multiple data points across time periods
- Strategic recommendations based on data patterns
- Detailed financial analysis
Keep answers thorough and data-driven in Oracle mode.
In normal mode, keep answers concise and action-oriented.
```

---

## Part 4: Error Handling

### Wrap all tool execute functions in try-catch

Every tool's execute function should catch errors and return a structured error response instead of crashing:

```typescript
execute: async (params) => {
  try {
    // ... actual logic
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Tool error (${toolName}):`, message);
    return {
      success: false,
      error: `เกิดข้อผิดพลาด: ${message}`,
    };
  }
}
```

**Check that ALL 16 tools have this pattern.** The Phase 2 write tools already have it (we added it when fixing the singleSelect bugs), but verify the Phase 1 read tools and Phase 3-4 tools also have try-catch.

### Error result card

Make sure the `ToolResultCard` component handles the error case for ALL tool types. If `data.success === false` or if `data.error` exists, show the error card:

```tsx
// At the top of the ToolResultCard switch, before checking toolName:
if (data && typeof data === 'object' && 'error' in data && !('success' in data && data.success !== false)) {
  return (
    <div className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3">
      <div className="font-medium text-red-300">❌ เกิดข้อผิดพลาด</div>
      <div className="text-sm text-slate-400 mt-1">{String(data.error)}</div>
    </div>
  );
}
```

### System prompt addition for error handling:

```
ERROR HANDLING:
- If a tool returns an error, explain it to the user in simple Thai.
- Common errors:
  - "ไม่พบสินค้า" = product not found, suggest trying a different name or SKU
  - "สต็อกไม่พอ" = insufficient stock, show current stock and ask if they want to continue
  - "ไม่พบลูกค้า" = customer not found, offer to create new
  - "ไม่พบผู้จำหน่าย" = supplier not found, offer to create new
  - Network/API errors = tell user to try again in a moment
- Never show raw error messages or JSON to the user.
- Always suggest a next step after an error.
```

---

## Part 5: Multi-Item Sale UX Refinement

The multi-item sale flow already works conversationally, but refine the system prompt to make it smoother:

```
MULTI-ITEM SALE FLOW:
After confirming the first item (product + quantity), ALWAYS ask:
"เพิ่มสินค้าอีกไหมคะ? หรือชำระเลย?"

If adding more items:
- Ask for the next product (scan QR or type name)
- Keep a running total: "รวม 2 รายการ: ฿105"
- After each item, ask again: "เพิ่มอีกไหม?"

When ready to pay:
- Show full summary of ALL items with subtotals
- Ask payment method
- Confirm before creating

The create_sale tool accepts an items ARRAY — send ALL items in ONE tool call, not one per item.
```

---

## Part 6: Version/Audit Info

### Add app version display

Add a small version indicator at the bottom of the chat or in the header:

```tsx
<div className="text-xs text-slate-600 text-center py-1">
  Pinit AI v1.0 — Phase 5
</div>
```

### Add `created_by` tracking

The `create_sale` tool already sets `created_by: 'Mai'`. For future multi-user support, we could detect who's logged in. For now, add to the system prompt:

```
AUDIT TRACKING:
- All sales created through this chat are marked as created_by: 'Mai'
- If Mint is using the chat (detected by English language or explicit statement), set created_by: 'Mint'
- If Boot is using the chat, set created_by: 'Boot'
- Always include a note field on write operations indicating the record was created via AI chat: "สร้างผ่าน AI Chat"
```

### System prompt addition:

```
When creating any record (sale, expense, purchase), always include in the note field:
"สร้างผ่าน AI Chat" — this helps distinguish AI-created records from Fillout form records during the transition period.
```

---

## Part 7: Minor UX Polish

### Loading state improvement

When Claude is thinking (isLoading), show which tool is being called if available:

The current loading state is: `กำลังคิด...`

Keep it simple — no need to show the specific tool. But make sure the loading indicator is visible and consistent.

### Auto-focus input

After each assistant message, auto-focus the input field so Mai can immediately type:

```tsx
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (!isLoading) {
    inputRef.current?.focus();
  }
}, [isLoading]);
```

Add `ref={inputRef}` to the input element.

### Scroll behavior

Verify that auto-scroll to bottom works reliably, especially after tool result cards render (they can be tall and push content down).

### Prevent empty submissions

Already handled with `disabled={isLoading || !input.trim()}` on the submit button. Verify this is in place.

---

## Testing Checklist

1. **Navigation** — home page has link to /chat, chat page has links to /inventory and /
2. **Clear chat** — 🗑 button clears all messages, fresh start
3. **Oracle mode** — toggle 🧠, verify header changes color, verify API uses Opus model (check Anthropic console for model usage)
4. **Oracle query** — with Oracle ON, ask "What strategic changes should we make based on our margin data?" — should get a detailed, analytical response
5. **Error handling** — disconnect wifi temporarily, try a tool call — should show Thai error message, not crash
6. **Multi-item sale** — add 3 items to a sale, verify all 3 show in summary, all 3 create as line items
7. **Auto-focus** — after Claude responds, cursor should be in input field
8. **Version display** — version text visible somewhere in the UI
9. **Audit trail** — create a sale, check Airtable — `note` field should contain "สร้างผ่าน AI Chat"
10. **created_by detection** — use English with Claude, create a sale — should set created_by to 'Mint'

---

## After Phase 5

The app is production-ready for Mai's daily use. Remaining future items (Phase 6+):
- Voice input (speech-to-text for Thai)
- LINE integration (chat via LINE instead of browser)
- Receipt printing
- Customer history tool
- Inventory reorder suggestions
- Version control / undo for records
- Audit dashboard for Mint
