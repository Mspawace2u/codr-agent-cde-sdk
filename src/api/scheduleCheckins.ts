/**
 * ⏰ scheduleCheckins.ts
 * Cloudflare Cron-triggered job to send Day 1/3/7 check-in emails.
 *
 * Expects a D1 table `feedback` for submitted notes and `agents` with email fields
 * (if you later collect user email at creation time). For now this demonstrates
 * the scheduling scaffold; plug in how you store recipient emails.
 */

import { sendCheckinEmail } from "../utils/emailCheckin";

interface Env {
  AGENT_REGISTRY_DB: D1Database;
  APP_URL: string;
  MAIL_FROM: string;
  MAIL_REPLYTO?: string;
}

export default {
  /**
   * Called by Cloudflare Cron as configured in wrangler.toml
   */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    // 1) Find agents created 1, 3, 7 days ago
    const days = [1, 3, 7];
    const now = new Date();

    for (const d of days) {
      const target = new Date(now);
      target.setDate(now.getDate() - d);

      // NOTE: If you capture user email at agent creation, store it in `agents.user_email`
      // For now, this query just grabs the agent IDs created on target day
      const dayStr = target.toISOString().slice(0, 10); // YYYY-MM-DD
      const q = `
        SELECT id, name
        FROM agents
        WHERE date(created_at) = ?
      `;

      const res = await env.AGENT_REGISTRY_DB.prepare(q).bind(dayStr).all<{ id: string; name: string }>();
      if (!res.results?.length) continue;

      // TODO: Replace this placeholder email with your real storage field.
      // Example: SELECT user_email FROM agents WHERE id = ?
      const placeholderEmail = "you@example.com";

      for (const row of res.results) {
        try {
          await sendCheckinEmail(
            { APP_URL: env.APP_URL, MAIL_FROM: env.MAIL_FROM, MAIL_REPLYTO: env.MAIL_REPLYTO },
            placeholderEmail,
            row.name,
            d
          );
          // Optionally record that we attempted to send (not required)
          // await env.AGENT_REGISTRY_DB.prepare(
          //   "INSERT INTO reminders (id, run_id, stage, next_reminder_at) VALUES (?, ?, ?, ?)"
          // ).bind(crypto.randomUUID(), row.id, d, Date.now()).run();
        } catch (err) {
          // Swallow errors for now; add logging if desired
          // console.error("Check-in email failed", err);
        }
      }
    }
  },
};
