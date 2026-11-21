// Core: monitor an Anthropic Managed Agents deployment.
// 1) list the deployment's runs  2) pick the latest run that created a session
// 3) open the session event stream  4) send a user.message  5) yield agent text until idle or error
import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_DEPLOYMENT = 'depl_015qQAdokxkBNmFH86Uxijec';

export async function* monitorDeployment({ deploymentId = DEFAULT_DEPLOYMENT, message, apiKey = process.env.ANTHROPIC_API_KEY, signal, maxRuns = 200 } = {}) {
  if (!apiKey) { yield { type: 'error', text: 'ANTHROPIC_API_KEY is not set.' }; return; }
  const client = new Anthropic({ apiKey });
  let stream;
  try {
    yield { type: 'status', text: `Listing runs for ${deploymentId}…` };
    const runs = [];
    for await (const run of client.beta.deploymentRuns.list({ deployment_id: deploymentId })) {
      runs.push(run); if (runs.length >= maxRuns) break;
    }
    runs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    yield { type: 'runs', runs: runs.slice(0, 10).map(r => ({ id: r.id, created_at: r.created_at, session_id: r.session_id, error: r.error?.type || null, trigger: r.trigger_context?.type || null })) };
    const latest = runs.find(r => r.session_id);
    if (!latest) { yield { type: 'error', text: runs.length ? 'No run has created a session yet (latest runs errored).' : 'This deployment has no runs yet.' }; return; }
    yield { type: 'status', text: `Latest run ${latest.id} → session ${latest.session_id}` };

    // Open the stream first, then send, so no events are missed.
    stream = await client.beta.sessions.events.stream(latest.session_id, {}, { signal });
    if (message) {
      await client.beta.sessions.events.send(latest.session_id, { events: [{ type: 'user.message', content: [{ type: 'text', text: message }] }] });
      yield { type: 'status', text: 'Message sent. Waiting for the agent…' };
    }
    for await (const event of stream) {
      switch (event.type) {
        case 'agent.message':
          for (const block of event.content || []) if (block.type === 'text') yield { type: 'text', text: block.text };
          break;
        case 'session.status_idle':
          yield { type: 'done', text: `Session idle (${event.stop_reason?.type || 'end_turn'}).` }; return;
        case 'session.status_terminated':
          yield { type: 'done', text: 'Session terminated.' }; return;
        case 'session.error':
          yield { type: 'error', text: event.error?.message || 'Session error.' }; return;
        default:
          if (event.type?.startsWith('session.status_')) yield { type: 'status', text: event.type.replace('session.status_', 'Status: ') };
      }
    }
    yield { type: 'done', text: 'Stream closed.' };
  } catch (err) {
    if (signal?.aborted) { yield { type: 'done', text: 'Stopped.' }; return; }
    const status = err?.status ? ` (HTTP ${err.status})` : '';
    yield { type: 'error', text: (err?.error?.error?.message || err?.message || 'Unknown error') + status };
  } finally {
    try { stream?.controller?.abort(); } catch {}
  }
}
