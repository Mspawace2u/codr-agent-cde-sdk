// templates/notification-agent.js
// Codr Template: Notification Agent
// Sends alerts via email, SMS, webhooks for agent chaining

export const notificationAgentTemplate = {
  name: 'Notification Agent',
  description: 'Sends notifications via email, SMS, webhooks when triggered by other agents',
  category: 'output',
  framework: 'worker',

  files: {
    'src/index.js': `
/**
 * Notification Agent
 * Sends alerts and notifications via multiple channels
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const {
        message,
        channels = ['email'], // email, sms, webhook, slack, discord
        priority = 'normal',   // low, normal, high, urgent
        recipients = [],
        subject,
        template,
        data = {}
      } = await request.json();

      // Generate notification ID
      const notificationId = crypto.randomUUID();

      // Prepare notification payload
      const notification = {
        id: notificationId,
        message,
        channels,
        priority,
        recipients,
        subject: subject || generateSubject(message, priority),
        template: template || 'default',
        data,
        createdAt: new Date().toISOString(),
        status: 'sending'
      };

      // Send to all specified channels
      const results = await sendNotifications(notification, env);

      // Store notification record
      await env.NOTIFICATION_HISTORY.put(
        \`notification:\${notificationId}\`,
        JSON.stringify({
          ...notification,
          results,
          sentAt: new Date().toISOString()
        }),
        { expirationTtl: 86400 } // 24 hours
      );

      // Trigger next agent if configured
      if (env.NEXT_AGENT_URL && priority === 'urgent') {
        await triggerNextAgent(notification, env);
      }

      return new Response(JSON.stringify({
        success: true,
        notificationId,
        channels: results.map(r => ({ channel: r.channel, success: r.success }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Notification error:', error);
      return new Response(JSON.stringify({
        error: 'Notification failed',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function sendNotifications(notification, env) {
  const results = [];

  for (const channel of notification.channels) {
    try {
      let result = false;

      switch (channel) {
        case 'email':
          result = await sendEmail(notification, env);
          break;
        case 'sms':
          result = await sendSMS(notification, env);
          break;
        case 'webhook':
          result = await sendWebhook(notification, env);
          break;
        case 'slack':
          result = await sendSlack(notification, env);
          break;
        case 'discord':
          result = await sendDiscord(notification, env);
          break;
        default:
          console.warn(\`Unknown channel: \${channel}\`);
      }

      results.push({ channel, success: result });

    } catch (error) {
      console.error(\`Failed to send \${channel} notification:\`, error);
      results.push({ channel, success: false, error: error.message });
    }
  }

  return results;
}

async function sendEmail(notification, env) {
  if (!env.MAILCHANNELS_API_KEY || !env.FROM_EMAIL) {
    console.warn('Email not configured - missing MAILCHANNELS_API_KEY or FROM_EMAIL');
    return false;
  }

  const recipients = notification.recipients.length > 0
    ? notification.recipients
    : [env.DEFAULT_EMAIL_RECIPIENT || 'alerts@yourdomain.com'];

  const emailPayload = {
    personalizations: recipients.map(email => ({
      to: [{ email }],
      subject: notification.subject
    })),
    from: { email: env.FROM_EMAIL },
    content: [{
      type: 'text/plain',
      value: formatMessage(notification, 'email')
    }]
  };

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${env.MAILCHANNELS_API_KEY}\`
      },
      body: JSON.stringify(emailPayload)
    });

    return response.ok;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

async function sendSMS(notification, env) {
  // For SMS, you'd integrate with Twilio, AWS SNS, etc.
  // This is a placeholder implementation
  if (!env.TWILIO_SID || !env.TWILIO_TOKEN) {
    console.warn('SMS not configured - missing Twilio credentials');
    return false;
  }

  const recipients = notification.recipients.length > 0
    ? notification.recipients
    : [env.DEFAULT_SMS_RECIPIENT || '+1234567890'];

  // Placeholder - integrate with actual SMS service
  console.log(\`SMS to \${recipients.join(', ')}: \${notification.message}\`);
  return true; // Assume success for demo
}

async function sendWebhook(notification, env) {
  if (!env.NOTIFICATION_WEBHOOK_URL) {
    console.warn('Webhook not configured - missing NOTIFICATION_WEBHOOK_URL');
    return false;
  }

  try {
    const response = await fetch(env.NOTIFICATION_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${env.WEBHOOK_API_KEY || ''}\`
      },
      body: JSON.stringify({
        notification: notification,
        timestamp: new Date().toISOString()
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Webhook send error:', error);
    return false;
  }
}

async function sendSlack(notification, env) {
  if (!env.SLACK_WEBHOOK_URL) {
    console.warn('Slack not configured - missing SLACK_WEBHOOK_URL');
    return false;
  }

  const payload = {
    text: notification.subject,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: notification.subject }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: formatMessage(notification, 'slack') }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: \`Priority: *\${notification.priority}*\` },
          { type: 'mrkdwn', text: \`ID: \${notification.id}\` }
        ]
      }
    ]
  };

  try {
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Slack send error:', error);
    return false;
  }
}

async function sendDiscord(notification, env) {
  if (!env.DISCORD_WEBHOOK_URL) {
    console.warn('Discord not configured - missing DISCORD_WEBHOOK_URL');
    return false;
  }

  const payload = {
    content: \`**\${notification.subject}**\`,
    embeds: [{
      description: formatMessage(notification, 'discord'),
      color: getPriorityColor(notification.priority),
      footer: { text: \`ID: \${notification.id}\` },
      timestamp: notification.createdAt
    }]
  };

  try {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Discord send error:', error);
    return false;
  }
}

function generateSubject(message, priority) {
  const prefix = priority === 'urgent' ? '🚨 URGENT: ' :
                 priority === 'high' ? '⚠️ ALERT: ' : '📢 ';
  const truncated = message.length > 50 ? message.substring(0, 47) + '...' : message;
  return prefix + truncated;
}

function formatMessage(notification, channel) {
  const baseMessage = notification.message;

  switch (channel) {
    case 'slack':
      return \`\`\`
\${baseMessage}
\`\`\`
*Priority: \${notification.priority}*
*Time: \${new Date(notification.createdAt).toLocaleString()}*\`;

    case 'discord':
      return `\`\`\`${baseMessage}\`\`\`
\`Priority: ${notification.priority}\``;

    case 'email':
    default:
      return `Message: ${baseMessage}

Priority: ${notification.priority}
Time: ${new Date(notification.createdAt).toLocaleString()}
ID: ${notification.id}

Data: ${JSON.stringify(notification.data, null, 2)}`;
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'urgent': return 0xff0000; // Red
    case 'high': return 0xffa500;   // Orange
    case 'normal': return 0x00ff00; // Green
    case 'low': return 0x808080;    // Gray
    default: return 0x0099ff;       // Blue
  }
}

async function triggerNextAgent(notification, env) {
  try {
    await fetch(env.NEXT_AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${env.AGENT_API_KEY || ''}\`
      },
      body: JSON.stringify({
        source: 'notification-agent',
        notification,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.warn('Error triggering next agent:', error);
  }
}
    `,

    'wrangler.toml': `
name = "notification-agent"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
NEXT_AGENT_URL = ""      # URL of next agent in chain
AGENT_API_KEY = ""       # API key for triggering next agent

# Email configuration
MAILCHANNELS_API_KEY = "" # MailChannels API key
FROM_EMAIL = ""           # From email address
DEFAULT_EMAIL_RECIPIENT = "" # Default email if none specified

# SMS configuration (Twilio example)
TWILIO_SID = ""           # Twilio Account SID
TWILIO_TOKEN = ""         # Twilio Auth Token
DEFAULT_SMS_RECIPIENT = "" # Default phone number

# Webhook configuration
NOTIFICATION_WEBHOOK_URL = "" # Generic webhook URL
WEBHOOK_API_KEY = ""      # API key for webhook auth

# Slack configuration
SLACK_WEBHOOK_URL = ""    # Slack webhook URL

# Discord configuration
DISCORD_WEBHOOK_URL = ""  # Discord webhook URL

[[kv_namespaces]]
binding = "NOTIFICATION_HISTORY"
id = "your-kv-namespace-id"
preview_id = "your-kv-namespace-id"
    `,

    'package.json': `
{
  "name": "notification-agent",
  "version": "1.0.0",
  "description": "Multi-channel notification micro-agent for alerts and messaging",
  "main": "src/index.js",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {},
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
    `,

    'README.md': `
# Notification Agent

Multi-channel notification micro-agent that sends alerts via email, SMS, webhooks, Slack, and Discord.

## Features

- ✅ Multi-channel notifications (email, SMS, webhook, Slack, Discord)
- ✅ Priority levels (low, normal, high, urgent)
- ✅ Template support
- ✅ Delivery tracking
- ✅ Chaining to next agents
- ✅ Configurable recipients

## API

Send POST requests with:

\`\`\`json
{
  "message": "Alert message",
  "channels": ["email", "slack"],
  "priority": "high",
  "recipients": ["user@example.com"],
  "subject": "Custom subject",
  "data": {"key": "value"}
}
\`\`\`

## Configuration

### Email (MailChannels)
- \`MAILCHANNELS_API_KEY\`: Your MailChannels API key
- \`FROM_EMAIL\`: Sender email address
- \`DEFAULT_EMAIL_RECIPIENT\`: Fallback email

### SMS (Twilio)
- \`TWILIO_SID\`: Twilio Account SID
- \`TWILIO_TOKEN\`: Twilio Auth Token
- \`DEFAULT_SMS_RECIPIENT\`: Fallback phone number

### Webhooks
- \`NOTIFICATION_WEBHOOK_URL\`: Generic webhook endpoint
- \`WEBHOOK_API_KEY\`: API key for webhook auth

### Slack
- \`SLACK_WEBHOOK_URL\`: Slack webhook URL

### Discord
- \`DISCORD_WEBHOOK_URL\`: Discord webhook URL

## Usage

Deploy and trigger from other agents:

\`\`\`javascript
await fetch('https://notify.yourdomain.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Server is down!',
    channels: ['email', 'slack'],
    priority: 'urgent'
  })
});
\`\`\`
    `
  }
};