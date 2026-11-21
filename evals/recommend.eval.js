// Eval harness for the ChefMii concierge. Run: npm run eval
import { recommendLocal } from '../demo/agent.js';
import { CHEFS } from '../demo/data.js';
const cases = [
  { name: 'Ghanaian engagement North London', text: 'Ghanaian engagement party, 40 guests, North London, waakye and banku', expectTop: ['kofi', 'james'] },
  { name: 'Nigerian naming ceremony budget', text: 'Naming ceremony for 30 in Lewisham, Nigerian food, about £35 a head', expectTop: ['aisha', 'tunde', 'adaeze'] },
  { name: 'Sierra Leonean small party', text: 'Sierra Leonean food for 9 people in East London', expectTop: ['fatmata'] },
  { name: 'Nut allergy flagged', text: '15 people for my mum\'s birthday in E15, one guest has a nut allergy', expectAllergy: true },
  { name: 'Igbo Christmas vegetarian', text: 'Christmas dinner for 12, Igbo food, some vegetarians', expectTop: ['adaeze'] },
  { name: 'Min guests respected', text: 'Birthday for 9 guests', check: r => r.picks.every(p => p.quote.guests >= CHEFS.find(c => c.id === p.id).min) },
  { name: 'Empty request still answers', text: '', check: r => r.picks.length === 3 }
];
let pass = 0;
for (const c of cases) {
  const r = recommendLocal(c.text, {});
  const ids = r.picks.map(p => p.id);
  let ok = r.picks.every(p => CHEFS.some(x => x.id === p.id));
  if (c.expectTop) ok = ok && c.expectTop.includes(ids[0]);
  if (c.expectAllergy) ok = ok && !!r.intent.allergy && r.trace.some(t => t.step === 'safety');
  if (c.check) ok = ok && c.check(r);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}  → ${ids.join(', ')}`);
  if (ok) pass++;
}
console.log(`\n${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
