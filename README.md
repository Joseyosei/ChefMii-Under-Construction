# ChefMii

- `/` : "Under construction" page (live at chefmii.com)
- `/demo/` : prototype v0.2 (search, AI concierge, chef profiles, request flow, cookie consent, privacy and cookie policies) at chefmii.com/demo
- `/api/recommend` : AI concierge agent (Claude tool use if `ANTHROPIC_API_KEY` is set in Vercel, otherwise the rules agent). See AGENTS.md. Run `npm run eval` before changing the agent.

Prototype: single static HTML file, no build step, no server. Booking requests are saved in the browser (localStorage). Chef applications go to the ChefMii Google Form. All chefs shown are demo profiles.

Planned production stack: Next.js (TypeScript) + Tailwind + Supabase (Postgres, auth, storage) + Stripe Connect, hosted on Vercel.

## Agent monitor (Managed Agents)
- `lib/monitor-core.js`: lists runs of a deployment (`client.beta.deploymentRuns.list`), opens the latest run's session stream (`client.beta.sessions.events.stream`), sends a `user.message` (`client.beta.sessions.events.send`), yields `agent.message` text; stops on `session.status_idle`, `session.status_terminated` or `session.error`; errors end cleanly.
- CLI: `ANTHROPIC_API_KEY=... npm run monitor -- "Your message" [depl_id]`
- Web: `POST /api/monitor` streams Server-Sent Events. Set `ANTHROPIC_API_KEY` and `MONITOR_TOKEN` in Vercel; the "Agent monitor" button on the site asks for the token.
