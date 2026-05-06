# Cost Optimization Plan — Claude Code Implementation

> **Paste this into Claude Code.** Reduces API costs by an estimated 60-80%.

---

## Current Cost Problem

Our system sends on EVERY message:
- ~5,000+ token system prompt (all workflow instructions)
- 21 tool definitions (~2,000-5,000 tokens of schema overhead)
- Full conversation history (grows with each message)
- All at Sonnet 4.6 pricing ($3/$15 per MTok)

For a 20-message conversation, that's roughly:
- System prompt: 5K × 20 = 100K tokens
- Tool schemas: 3K × 20 = 60K tokens
- Conversation history: ~80K tokens (growing)
- Output: ~10K tokens
- **Total: ~250K tokens per conversation ≈ $1.50-2.00**

---

## Optimization 1: Prompt Caching (BIGGEST WIN — ~90% savings on system prompt)

The Vercel AI SDK supports Anthropic's prompt caching via `providerOptions`.

### In `app/api/chat/route.ts`:

```typescript
import { streamText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages, oracleMode } = await req.json();

  const result = streamText({
    model: anthropic(oracleMode ? 'claude-opus-4-6' : 'claude-sonnet-4-6'),
    system: SYSTEM_PROMPT,
    messages,
    tools: chatTools,
    maxSteps: 5,
    providerOptions: {
      anthropic: {
        cacheControl: { type: 'ephemeral' },
      },
    },
  });

  return result.toDataStreamResponse();
}
```

**How it works:**
- First message in a conversation: system prompt + tools are sent and cached (1.25x write cost)
- All subsequent messages within 5 minutes: system prompt + tools read from cache (0.10x cost = 90% savings)
- Mai sends messages every few seconds during active use, so the cache stays warm
- Cache resets after 5 minutes of inactivity (new conversation starts cold)

**Expected savings:** System prompt + tools go from ~8K tokens per message to ~800 effective tokens. Over 20 messages, saves ~140K tokens = ~$0.40 per conversation.

---

## Optimization 2: Route Simple Lookups to Haiku 4.5 (3x cheaper)

Not every message needs Sonnet. Product lookups, customer searches, and stock checks are simple retrieval tasks that Haiku handles perfectly.

### Model routing logic in `app/api/chat/route.ts`:

```typescript
function selectModel(messages: any[], oracleMode: boolean): string {
  if (oracleMode) return 'claude-opus-4-6';
  
  // Check the latest user message for complexity signals
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const content = lastUserMsg?.content?.toLowerCase() || '';
  
  // Simple lookups → Haiku
  const simplePatterns = [
    // Product/customer/stock lookups
    /^(pd69|สแกนได้)/i,           // SKU or QR scan
    /^[0-9]{3,}$/,                 // Pure number (SKU partial)
    /^(ค้นหา|หา|ดู|เช็ค)/,         // Search/check prefixes
    // Confirmations
    /^(ใช่|ตกลง|ยืนยัน|yes|ok|ข้าม)$/i,  // Simple yes/no/skip
    // Single word product names
  ];
  
  // Analytics, complex flows, multi-step reasoning → Sonnet
  const complexPatterns = [
    /กำไร|margin|วิเคราะห์|analysis/, // Analytics
    /สรุป.*เดือน|summary.*month/,      // Period summaries
    /เปรียบเทียบ|compare/,             // Comparisons
    /(ต้องการ|บันทึก).*(ขาย|ซื้อ|ซ่อม|จ่าย)/, // Write operations (need good reasoning)
  ];
  
  // Check for complex patterns first (they take priority)
  for (const pattern of complexPatterns) {
    if (pattern.test(content)) return 'claude-sonnet-4-6';
  }
  
  // Check for simple patterns
  for (const pattern of simplePatterns) {
    if (pattern.test(content)) return 'claude-haiku-4-5-20251001';
  }
  
  // Default to Sonnet for anything ambiguous
  return 'claude-sonnet-4-6';
}
```

Then use it:
```typescript
const model = selectModel(messages, oracleMode);

const result = streamText({
  model: anthropic(model),
  // ... rest stays the same
});
```

**Expected savings:** ~40% of messages are simple lookups/confirmations. Those go from $3/$15 (Sonnet) to $1/$5 (Haiku) = 3x cheaper on those messages.

**IMPORTANT NOTE:** This is a heuristic approach. If Haiku gives noticeably worse results on any task, we can remove that pattern from the simple list. Start conservative — only route the most obvious simple tasks to Haiku.

---

## Optimization 3: Tool Subsetting (reduce tool schema tokens)

Instead of sending all 21 tools on every message, send only the tools relevant to the current conversation context.

### Create tool groups in `lib/chat-tools.ts`:

```typescript
// Tool groups by workflow
export const TOOL_GROUPS = {
  // Always available — basic lookups
  core: ['lookup_product', 'search_customer', 'get_repair_jobs', 'get_today_sales'],
  
  // Sale flow
  sale: ['lookup_product', 'search_customer', 'create_sale'],
  
  // Purchase flow
  purchase: ['lookup_product', 'create_purchase'],
  
  // Receiving flow
  receiving: ['get_pending_receiving', 'confirm_receiving'],
  
  // Expense flow
  expense: ['create_expense'],
  
  // Repair flow
  repair: ['get_repair_jobs', 'search_customer', 'create_repair_job', 'update_repair_status', 'update_repair_from_workorder'],
  
  // Stock count
  stock: ['lookup_product', 'update_stock_count', 'print_label'],
  
  // Product management
  product: ['lookup_product', 'update_product', 'print_label'],
  
  // Analytics
  analytics: ['get_sales_summary', 'get_purchase_summary', 'get_margin_analysis', 'get_slow_movers', 'get_top_sellers', 'get_cash_flow_summary'],
  
  // Admin
  admin: ['delete_record', 'update_product'],
};

export function getToolsForContext(messages: any[]): Record<string, any> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const content = lastUserMsg?.content?.toLowerCase() || '';
  
  // Detect workflow from message content or context button prompts
  let groups = new Set<string>(['core']); // always include core
  
  if (content.includes('บันทึกการขาย') || content.includes('ขายสินค้า')) groups.add('sale');
  if (content.includes('บันทึกการซื้อ')) groups.add('purchase');
  if (content.includes('รับสินค้า') || content.includes('รับของ')) groups.add('receiving');
  if (content.includes('ค่าใช้จ่าย')) groups.add('expense');
  if (content.includes('งานซ่อม') || content.includes('รับงานซ่อม')) groups.add('repair');
  if (content.includes('นับสต็อก') || content.includes('สต็อก')) groups.add('stock');
  if (content.includes('พิมพ์ฉลาก')) groups.add('product');
  if (content.includes('กำไร') || content.includes('margin') || content.includes('สรุป') || content.includes('ขายดี') || content.includes('ค้างสต็อก') || content.includes('cash flow')) groups.add('analytics');
  if (content.includes('ลบ') || content.includes('delete') || content.includes('แก้ไข')) groups.add('admin');
  
  // If no specific workflow detected, include all tools (fallback)
  if (groups.size === 1) { // only 'core'
    return chatTools; // send all tools
  }
  
  // Merge selected groups
  const toolNames = new Set<string>();
  for (const group of groups) {
    for (const tool of TOOL_GROUPS[group as keyof typeof TOOL_GROUPS] || []) {
      toolNames.add(tool);
    }
  }
  
  // Filter chatTools to only include selected tools
  const filtered: Record<string, any> = {};
  for (const name of toolNames) {
    if (chatTools[name as keyof typeof chatTools]) {
      filtered[name] = chatTools[name as keyof typeof chatTools];
    }
  }
  
  return filtered;
}
```

### Use in route.ts:

```typescript
const selectedTools = getToolsForContext(messages);

const result = streamText({
  model: anthropic(model),
  system: SYSTEM_PROMPT,
  messages,
  tools: selectedTools,  // only relevant tools
  maxSteps: 5,
  providerOptions: {
    anthropic: {
      cacheControl: { type: 'ephemeral' },
    },
  },
});
```

**Expected savings:** Instead of 21 tool schemas (~3K-5K tokens), we send 4-8 tools (~1K-2K tokens). Saves ~2K tokens per message.

**CAVEAT:** Tool subsetting can break prompt caching if the tool set changes between messages (different cache key). To avoid this, we might need to keep a stable tool set per conversation rather than per message. An alternative: always send tools in a fixed order and cache them, then add workflow-specific tools after the cache breakpoint.

**Simpler alternative if caching conflicts:** Skip tool subsetting for now and rely on prompt caching + Haiku routing for the main savings. Add tool subsetting later as a v2 optimization.

---

## Optimization 4: Trim System Prompt

Move detailed workflow checklists and field requirements OUT of the system prompt and INTO each tool's description. Claude reads tool descriptions when deciding which tool to call and when executing it — the info doesn't need to be in the system prompt too.

### What stays in system prompt (core behavior):
- Language rules
- User detection (Mai/Mint/Boot)
- Shop context
- Response format rules (no markdown tables, short follow-ups)
- Confirmation rule for writes
- Session context (per-customer)
- Speed mode detection

### What moves to tool descriptions:
- Field checklists per workflow → move to the relevant tool's `description`
- Exact Airtable field names and normalization rules → already in tool execute code
- Edge case handling per workflow → move to tool description
- Status transition rules → move to `update_repair_status` description

### What gets shortened:
- Expense category list → shorten to "see tool description for full list"
- Payment method lists → already handled by normalization maps in code
- Date handling for analytics → move to analytics tool descriptions

**Estimated reduction:** System prompt from ~5K tokens to ~2K tokens. Combined with caching, this is very effective.

---

## Optimization 5: Message History Truncation

After 15+ messages, older messages cost more than they're worth. Summarize and trim.

### In `app/api/chat/route.ts`:

```typescript
const MAX_MESSAGES = 20;

function trimMessages(messages: any[]): any[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  
  // Keep first 2 messages (context) + last 16 messages (recent)
  const kept = [
    ...messages.slice(0, 2),    // initial context
    ...messages.slice(-16),      // recent messages
  ];
  
  return kept;
}
```

Use:
```typescript
const trimmedMessages = trimMessages(messages);

const result = streamText({
  model: anthropic(model),
  system: SYSTEM_PROMPT,
  messages: trimmedMessages,
  // ...
});
```

**Expected savings:** Prevents conversation history from growing unboundedly. Caps history at ~MAX_MESSAGES × avg_message_size tokens.

---

## Optimization 6: Concise Response Instructions

Add to system prompt to reduce output tokens:

```
RESPONSE LENGTH:
- Keep responses SHORT. 1-3 sentences for simple confirmations.
- Never repeat information already shown in tool result cards.
- Don't explain what you're about to do — just do it. ("กำลังค้นหา..." is unnecessary — just call the tool)
- For analytics, present key numbers first, then offer details if asked.
- Maximum response: 200 words for conversational messages, 400 words for analytics summaries.
```

**Expected savings:** ~30-50% reduction in output tokens ($15/MTok for Sonnet, so this adds up).

---

## Implementation Priority

Do these IN ORDER — each one is independent:

1. **Prompt caching** — single biggest win, minimal code change (just add providerOptions)
2. **Concise response instructions** — add to system prompt, no code change
3. **Message history truncation** — small code change in route.ts
4. **Haiku routing** — moderate code change in route.ts
5. **System prompt trimming** — larger change, needs careful testing
6. **Tool subsetting** — most complex, may conflict with caching, do last

---

## Measuring Results

After implementing, check the Anthropic console at console.anthropic.com:
- Compare daily token usage before and after
- Check cache hit rates (should see `cache_creation_input_tokens` and `cache_read_input_tokens`)
- Monitor cost per conversation
- Verify Haiku is being used for simple lookups (visible in the model breakdown)

---

## Expected Total Savings

| Optimization | Estimated Savings |
|---|---|
| Prompt caching | 60-80% on system prompt + tools (repeated input) |
| Haiku routing | 66% on simple lookups (~40% of messages) |
| Concise responses | 30-50% on output tokens |
| Message truncation | Prevents runaway costs on long conversations |
| System prompt trim | 50% reduction in base prompt size |
| Tool subsetting | 40-60% on tool schema tokens |
| **Combined** | **Estimated 60-80% total cost reduction** |

From ~$2.00/conversation to ~$0.40-0.80/conversation.
