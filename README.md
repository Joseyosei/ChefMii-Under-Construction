# ChefMii

- `/` : "Under construction" page (live at chefmii.com)
- `/demo/` : prototype v0.2 (search, AI concierge, chef profiles, request flow, cookie consent, privacy and cookie policies) at chefmii.com/demo
- `/api/recommend` : AI concierge agent (Claude tool use if `ANTHROPIC_API_KEY` is set in Vercel, otherwise the rules agent). See AGENTS.md. Run `npm run eval` before changing the agent.

Prototype: single static HTML file, no build step, no server. Booking requests are saved in the browser (localStorage). Chef applications go to the ChefMii Google Form. All chefs shown are demo profiles.

Planned production stack: Next.js (TypeScript) + Tailwind + Supabase (Postgres, auth, storage) + Stripe Connect, hosted on Vercel.
