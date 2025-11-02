/**
 * 📬 emailCheckin.ts
 * Handles Day 1 / 3 / 7 check-in reminders via MailChannels.
 */

interface Env {
  APP_URL: string;
  MAIL_FROM: string;
  MAIL_REPLYTO?: string;
}

export async function sendCheckinEmail(
  env: Env,
  userEmail: string,
  agentName: string,
  checkinDay: number
): Promise<Response> {
  const subject = `Day ${checkinDay}: Time to check-in on ${agentName}`;
  const reportLink = `${env.APP_URL}/agents/${agentName}/checkin?day=${checkinDay}`;

  const htmlBody = `
  <div style="font-family:system-ui,sans-serif;font-size:16px;color:#111">
    <p>Hey there 👋,</p>
    <p>It’s <b>Day ${checkinDay}</b> — time to share how your agent is doing.</p>
    <p><a href="${reportLink}" style="display:inline-block;padding:10px 16px;
      background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;
      border-radius:10px;text-decoration:none;">Go to your check-in</a></p>
    <p>Deuces ✌️,<br>MCP Codr</p>
  </div>`;

  const mailData = {
    personalizations: [{ to: [{ email: userEmail }] }],
    from: { email: env.MAIL_FROM },
    reply_to: { email: env.MAIL_REPLYTO || env.MAIL_FROM },
    subject,
    content: [
      { type: "text/plain", value: `Day ${checkinDay} check-in for ${agentName}: ${reportLink}` },
      { type: "text/html", value: htmlBody }
    ]
  };

  return fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mailData)
  });
}
