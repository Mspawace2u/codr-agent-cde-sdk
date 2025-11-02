// templates/webhook-receiver.js
// Codr Template: Webhook Receiver Agent
// Accepts webhooks and processes data for chaining to other agents

export const webhookReceiverTemplate = {
  name: 'Webhook Receiver Agent',
  description: 'Accepts webhooks, validates them, and forwards processed data to other agents',
  category: 'input',
  framework: 'worker',

  files: {
    'src/index.js': `
/**
 * Webhook Receiver Agent
 * Accepts webhooks from external services and processes them
 */

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const url = new URL(request.url);
      const webhookType = url.pathname.split('/')[1]; // e.g., /github, /stripe, /custom

      // Get webhook data
      const body = await request.json().catch(() => ({}));
      const headers = Object.fromEntries(request.headers.entries());

      // Validate webhook (customize based on webhook source)
      const isValid = await validateWebhook(body, headers, env);

      if (!isValid) {
        return new Response('Invalid webhook signature', { status: 401 });
      }

      // Process webhook data
      const processedData = await processWebhookData(body, webhookType, env);

      // Store in KV for other agents to access
      const webhookId = crypto.randomUUID();
      await env.WEBHOOK_DATA.put(\`webhook:\${webhookId}\`, JSON.stringify({
        id: webhookId,
        type: webhookType,
        data: processedData,
        receivedAt: new Date().toISOString(),
        headers: headers
      }), { expirationTtl: 3600 }); // 1 hour TTL

      // Trigger next agent in chain (if configured)
      if (env.NEXT_AGENT_URL) {
        await triggerNextAgent(processedData, env);
      }

      // Log webhook receipt
      console.log(\`Webhook received: \${webhookType} - \${webhookId}\`);

      return new Response(JSON.stringify({
        success: true,
        webhookId,
        processed: true,
        nextAgentTriggered: !!env.NEXT_AGENT_URL
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
};

async function validateWebhook(body, headers, env) {
  // Customize validation based on webhook source
  // Example: GitHub webhook validation
  if (headers['x-hub-signature-256'] && env.WEBHOOK_SECRET) {
    const crypto = await import('crypto');
    const signature = headers['x-hub-signature-256'];
    const hmac = crypto.createHmac('sha256', env.WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(JSON.stringify(body)).digest('hex');
    return signature === digest;
  }

  // For custom webhooks, you might check API keys or other auth
  return true; // Allow all for demo - customize for production
}

async function processWebhookData(body, webhookType, env) {
  // Process webhook data based on type
  switch (webhookType) {
    case 'github':
      return {
        event: body.action,
        repository: body.repository?.name,
        sender: body.sender?.login,
        payload: body
      };

    case 'stripe':
      return {
        event: body.type,
        amount: body.data?.object?.amount,
        currency: body.data?.object?.currency,
        customer: body.data?.object?.customer,
        payload: body
      };

    default:
      // Generic processing
      return {
        type: webhookType,
        data: body,
        processedAt: new Date().toISOString()
      };
  }
}

async function triggerNextAgent(processedData, env) {
  try {
    const response = await fetch(env.NEXT_AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${env.AGENT_API_KEY || ''}\`
      },
      body: JSON.stringify({
        source: 'webhook-receiver',
        data: processedData,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.warn('Failed to trigger next agent:', response.status);
    }
  } catch (error) {
    console.warn('Error triggering next agent:', error);
  }
}
    `,

    'wrangler.toml': `
name = "webhook-receiver-agent"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
NEXT_AGENT_URL = ""  # URL of next agent in chain
WEBHOOK_SECRET = ""  # Secret for webhook validation
AGENT_API_KEY = ""   # API key for triggering next agent

[[kv_namespaces]]
binding = "WEBHOOK_DATA"
id = "your-kv-namespace-id"
preview_id = "your-kv-namespace-id"
    `,

    'package.json': `
{
  "name": "webhook-receiver-agent",
  "version": "1.0.0",
  "description": "Webhook receiver micro-agent for processing external data",
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
# Webhook Receiver Agent

This micro-agent accepts webhooks from external services, validates them, processes the data, and can trigger the next agent in your chain.

## Features

- ✅ Accepts webhooks from any source
- ✅ Validates webhook signatures (configurable)
- ✅ Processes data based on webhook type
- ✅ Stores processed data in KV
- ✅ Triggers next agent in chain
- ✅ Supports GitHub, Stripe, and custom webhooks

## Configuration

Set these environment variables:

- \`NEXT_AGENT_URL\`: URL of the next agent to trigger
- \`WEBHOOK_SECRET\`: Secret for validating webhook signatures
- \`AGENT_API_KEY\`: API key for authenticating with next agent

## Usage

Deploy this agent and configure external services to send webhooks to:
\`https://your-agent.yourdomain.com/webhook-type\`

Supported webhook types:
- \`/github\` - GitHub webhooks
- \`/stripe\` - Stripe webhooks
- \`/custom\` - Generic webhooks
    `
  }
};