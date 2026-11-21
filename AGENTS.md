# ChefMii concierge: agent harness

The concierge recommends West African chefs and dishes for London home celebrations.

- **Rules:** `demo/agent.js` → `RULES` (only catalogue chefs, respect minimum guests, flag allergies, never book or take payment).
- **Tools:** `search_chefs`, `get_chef`, `quote`, `dish_guide` (in `demo/agent.js`).
- **Engines:** `api/recommend.js` runs Claude with tool use when `ANTHROPIC_API_KEY` is set in Vercel (optional `ANTHROPIC_MODEL`). Without a key, or if the model fails, it runs the rules agent. The browser falls back to the same rules agent if the API is unreachable.
- **Verifier:** every answer passes `verify()`: unknown chefs are removed, minimum guests enforced, prices recalculated from the catalogue.
- **Observability:** every answer returns a `trace` shown under "How the agent decided"; the API logs engine, picks and latency.
- **Evals:** `npm run eval` must pass before deploying changes to the agent.
- **Features:** `agent/feature_list.json` tracks what is done and next.
