# ChefMii

- `/` : "Under construction" page (live at chefmii.com)
- `/demo/` : clickable prototype for mentor and chef interviews (live at chefmii.com/demo)

Prototype: single static HTML file, no build step, no server. Booking requests are saved in the browser (localStorage) and sent to ChefMii by WhatsApp. Chef applications go to the ChefMii Google Form. All chefs shown are demo profiles.

Planned production stack: Next.js (TypeScript) + Tailwind + Supabase (Postgres, auth, storage) + Stripe Connect, hosted on Vercel.
