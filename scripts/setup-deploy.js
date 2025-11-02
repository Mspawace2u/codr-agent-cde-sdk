#!/usr/bin/env node

/**
 * Codr Agent — Deploy to Cloudflare Setup Script
 *
 * This script helps configure your Codr Agent deployment with all necessary
 * Cloudflare resources, API keys, and environment variables.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setup() {
  console.log('🚀 Codr Agent — Deploy to Cloudflare Setup\n');

  // Check if wrangler is authenticated
  console.log('📋 Step 1: Cloudflare Authentication');
  console.log('Make sure you have:');
  console.log('  ✅ Cloudflare account with Workers + Workers for Platforms');
  console.log('  ✅ Advanced Certificate Manager (for wildcard domains)');
  console.log('  ✅ D1, R2, and KV enabled\n');

  const authenticated = await ask('Have you run "wrangler login" and authenticated? (y/n): ');
  if (authenticated.toLowerCase() !== 'y') {
    console.log('Please run "wrangler login" first, then re-run this script.');
    process.exit(1);
  }

  // API Keys setup
  console.log('\n🔑 Step 2: API Keys Configuration');

  const googleAIKey = await ask('Google AI Studio API Key (for code generation): ');
  const anthropicKey = await ask('Anthropic API Key (optional, for Claude): ');
  const openAIKey = await ask('OpenAI API Key (optional): ');
  const mailChannelsKey = await ask('MailChannels API Key (for email notifications): ');

  // Domain setup
  console.log('\n🌐 Step 3: Domain Configuration');
  const customDomain = await ask('Your custom domain (e.g., codragents.dev): ');
  const allowedEmail = await ask('Allowed email for access (your email): ');

  // Create .dev.vars file
  const devVars = `# Codr Agent Development Variables
GOOGLE_AI_STUDIO_API_KEY="${googleAIKey}"
${anthropicKey ? `ANTHROPIC_API_KEY="${anthropicKey}"` : ''}
${openAIKey ? `OPENAI_API_KEY="${openAIKey}"` : ''}
MAILCHANNELS_API_KEY="${mailChannelsKey}"
CUSTOM_DOMAIN="${customDomain}"
ALLOWED_EMAIL="${allowedEmail}"
SANDBOX_INSTANCE_TYPE="standard-3"
MAX_SANDBOX_INSTANCES="10"
LOG_LEVEL="info"
`;

  fs.writeFileSync('.dev.vars', devVars);
  console.log('✅ Created .dev.vars file');

  // Create .prod.vars for production
  const prodVars = `# Codr Agent Production Variables
GOOGLE_AI_STUDIO_API_KEY="${googleAIKey}"
${anthropicKey ? `ANTHROPIC_API_KEY="${anthropicKey}"` : ''}
${openAIKey ? `OPENAI_API_KEY="${openAIKey}"` : ''}
MAILCHANNELS_API_KEY="${mailChannelsKey}"
CUSTOM_DOMAIN="${customDomain}"
ALLOWED_EMAIL="${allowedEmail}"
SANDBOX_INSTANCE_TYPE="standard-3"
MAX_SANDBOX_INSTANCES="10"
LOG_LEVEL="info"
`;

  fs.writeFileSync('.prod.vars', prodVars);
  console.log('✅ Created .prod.vars file');

  // DNS Setup instructions
  console.log('\n🌐 Step 4: DNS Configuration Required');
  console.log(`Add this CNAME record in your Cloudflare dashboard for domain ${customDomain}:`);
  console.log('  Type: CNAME');
  console.log('  Name: *');
  console.log(`  Target: ${customDomain}`);
  console.log('  Proxy: ON (orange cloud)');
  console.log('\nThis enables wildcard subdomains like agent123.yourdomain.com');

  const dnsDone = await ask('\nHave you added the DNS record? (y/n): ');
  if (dnsDone.toLowerCase() !== 'y') {
    console.log('Please add the DNS record, then continue with deployment.');
  }

  // Wrangler configuration
  console.log('\n⚙️ Step 5: Wrangler Configuration');

  // Update wrangler.jsonc with custom domain
  const wranglerPath = 'wrangler.jsonc';
  let wranglerConfig = fs.readFileSync(wranglerPath, 'utf8');
  wranglerConfig = wranglerConfig.replace('"CUSTOM_DOMAIN": "",', `"CUSTOM_DOMAIN": "${customDomain}",`);
  wranglerConfig = wranglerConfig.replace('"ALLOWED_EMAIL": "",', `"ALLOWED_EMAIL": "${allowedEmail}",`);
  fs.writeFileSync(wranglerPath, wranglerConfig);
  console.log('✅ Updated wrangler.jsonc with your domain and email');

  console.log('\n🎯 Setup Complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run deploy');
  console.log('2. Visit your domain to start creating agents!');
  console.log('3. Your first agent will be available at a subdomain like:');
  console.log(`   https://agent-abc123.${customDomain}`);

  rl.close();
}

setup().catch(console.error);