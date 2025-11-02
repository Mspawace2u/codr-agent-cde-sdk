// templates/index.js
// Codr Agent Templates Registry
// Import all available micro-agent and app templates

// Agent templates (Workers)
export { webhookReceiverTemplate } from './webhook-receiver.js';
export { dataTransformerTemplate } from './data-transformer.js';
export { notificationAgentTemplate } from './notification-agent.js';

// App templates (React/Vite)
export { journalAppTemplate } from './journal-app.js';
export { ideaBankAppTemplate } from './idea-bank-app.js';
export { dashboardAppTemplate } from './dashboard-app.js';

// Template registry for easy access
export const AGENT_TEMPLATES = {
  // Micro-agents (Workers)
  'webhook-receiver': webhookReceiverTemplate,
  'data-transformer': dataTransformerTemplate,
  'notification-agent': notificationAgentTemplate,

  // Apps (React/Vite)
  'journal-app': journalAppTemplate,
  'idea-bank-app': ideaBankAppTemplate,
  'dashboard-app': dashboardAppTemplate,
};

// Helper functions
export function getTemplate(templateId) {
  return AGENT_TEMPLATES[templateId];
}

export function getAllTemplates() {
  return Object.values(AGENT_TEMPLATES);
}

export function getTemplatesByCategory(category) {
  return Object.values(AGENT_TEMPLATES).filter(template => template.category === category);
}

export function getTemplatesByFramework(framework) {
  return Object.values(AGENT_TEMPLATES).filter(template => template.framework === framework);
}

// Template categories
export const TEMPLATE_CATEGORIES = {
  // Agent categories
  input: 'Input/Ingestion Agents',
  processing: 'Data Processing Agents',
  analysis: 'Analysis & Intelligence Agents',
  output: 'Output & Communication Agents',
  management: 'Management & Control Agents',

  // App categories
  productivity: 'Productivity Apps',
  business: 'Business Applications',
  creative: 'Creative Tools',
  communication: 'Communication Apps'
};

// Framework types
export const FRAMEWORK_TYPES = {
  worker: 'Cloudflare Worker (Agent)',
  react: 'React Application',
  vite: 'Vite Application'
};