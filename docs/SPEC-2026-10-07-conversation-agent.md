# Spec: Zemi-Aku as a conversational, cultural agent

Carlos, 2026-10-07: the chat must feel fully two-way. It should be an educational partner that uses
what qloo.com promotes (connecting tastes across music, travel and places; pop culture), Puerto
Rican culture and trips. It should work with outside tools, and ChatGPT and Claude users should be
able to reach it. Decisions he made the same day:

- **Brain: not the Claude API.** A cheap model through OpenRouter. Default: `deepseek/deepseek-v4-pro`,
  $0.21 in / $0.42 out per million tokens, tool calling (OpenRouter price list, 2026-10-07). About
  $0.0015 per turn. Jev was considered; the vault's 9/22 decision and sources place it as a
  classifier, not a chat model.
- **Voice: Deepgram Voice Agent API**, one live socket for listen → think → speak, with natural
  interruption. `think.provider.type: "open_ai"` uses the app's guarded HTTPS think proxy,
  which calls OpenRouter with the same budget and output limits as text chat. Functions declared
  without an endpoint execute on the app server's relay (FunctionCallRequest → FunctionCallResponse);
  only verified map actions reach the browser. See `docs/VOICE-AGENT.md` for the implementation.
- **Connectors: yes, after the brain.** The same tools exposed as an MCP server on the hosted URL,
  so ChatGPT and Claude users add Zemi-Aku and their own subscription pays for the model.

## What Qloo already gives us (measured 2026-10-07)

| Link | Example result |
|---|---|
| Artist fans → places in a town | Bad Bunny → La Placita de Santurce, La Victoria, Coca-Cola Music Hall |
| Place fans → artists | Campioni → Tony Dize, Tito El Bambino, Vico C, Wisin & Yandel |
| Place fans → destinations | Campioni → San Juan, Fajardo, Santo Domingo, Miami |
| Place fans → movies, TV, books | Noisy (unrelated films). Leave out, or let the agent judge |

The official kit has more tools than the app uses: `qloo_recommend` (cross-domain),
`qloo_compare_audiences`, `qloo_trends`, `qloo_entity_tags`, `qloo_describe`.

## Phases

1. **No key needed (now).** Each business card gets "Its fans also love": music and trips, from Qloo.
   Search starts from an artist: "Bad Bunny" → where his fans go, in the open town or across the island.
2. **Text agent (needs `OPENROUTER_API_KEY` in `.env`, with a credit limit set on the key).**
   `/api/chat` keeps the conversation history and lets the model call tools: town catalog, find
   places, place details, fans-also-love, artist → places, Qloo kit tools, town history (Wikipedia).
   Map actions (fly to a town, show places, open a business) go back to the page. A daily spend cap
   applies on the server. The pattern answers stay as the fallback when the model is down or over the cap.
3. **Voice agent.** Deepgram Voice Agent with OpenRouter as its think stage; the same tools as
   browser functions. It replaces today's listen → answer → speak loop; that loop stays as the fallback.
4. **Connector.** An MCP endpoint on the hosted URL with the same tools. Needs hosting first.

## Ground rules for the agent

It answers from tool results, and says when it doesn't know. Puerto Rican culture and history come
from Wikipedia and its own knowledge, labeled as general knowledge, never presented as Qloo data.
Spanish uses *usted*. It never invents a place. Each reply ends by inviting the next question.
