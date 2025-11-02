// src/core/template-customizer.ts
// VibeSDK-style AI template customization pipeline

import { generateUIWithGoogle, callLLM, type EnvReq, type LLMChoice, type Provider } from "../lib/llm";
import { AgentStateDO } from "../do/AgentStateDO";
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

export interface TemplateDefinition {
  name: string;
  description: string;
  category: string;
  framework: string;
  complexity: string;
  capabilities: Record<string, boolean>;
  base_reference: string;
  package_patches?: any;
  variables: Record<string, string>;
  customization_prompts: {
    ui_generation: string;
    functionality: string;
  };
  api_integrations: Array<{
    type: string;
    capabilities?: string[];
    providers?: string[];
    purpose?: string;
  }>;
  deployment: {
    worker_type: string;
    routing: string;
    database: string;
    assets: string;
  };
  connections: {
    outputs: Array<{
      type: string;
      trigger: string;
      data: string;
      formats?: string[];
    }>;
    inputs: Array<{
      type: string;
      sources: string[];
    }>;
  };
}

export interface UserRequirements {
  // From 6-question intake
  name: string;
  jtbds: string;
  input_sources: string[];
  outputs: string[];
  api_keys_required: string[];
  next_step: string;

  // From style questions
  visual_style: {
    theme: string;
    color: string;
    font: string;
    vibe: string;
    motion: string;
    favorite_app?: string;
    screenshots?: string[];
  };

  // From LLM selection
  llm_models: Record<string, string>;
}

export class TemplateCustomizer {
  constructor(private env: EnvReq & { AGENT_STATE: DurableObjectNamespace }) {}

  async customizeTemplate(
    templateName: string,
    userRequirements: UserRequirements,
    agentId: string
  ): Promise<any> {
    // Load template definition
    const templateDef = this.loadTemplateDefinition(templateName);

    // Update progress
    const agentStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(agentId));
    await agentStub.fetch("https://do/progress", {
      method: "POST",
      body: JSON.stringify({
        phase: "customizing",
        progress: 10,
        status: "analyzing_requirements"
      })
    });

    // Apply variable substitution
    const customizedVars = this.applyVariableSubstitution(templateDef, userRequirements);

    // Generate UI customization
    const uiCustomization = await this.generateUICustomization(templateDef, userRequirements, customizedVars);

    // Generate functionality customization
    const functionalityCustomization = await this.generateFunctionalityCustomization(templateDef, userRequirements, customizedVars);

    // Apply package patches
    const packagePatches = this.applyPackagePatches(templateDef, userRequirements);

    // Generate final app structure
    const finalApp = this.generateFinalAppStructure(templateDef, {
      uiCustomization,
      functionalityCustomization,
      packagePatches,
      userRequirements,
      customizedVars
    });

    // Update progress
    await agentStub.fetch("https://do/progress", {
      method: "POST",
      body: JSON.stringify({
        phase: "customizing",
        progress: 90,
        status: "finalizing_app"
      })
    });

    return finalApp;
  }

  private loadTemplateDefinition(templateName: string): TemplateDefinition {
    try {
      const yamlPath = join(process.cwd(), 'templates', 'definitions', `${templateName}.yaml`);
      const yamlContent = readFileSync(yamlPath, 'utf8');
      return YAML.parse(yamlContent) as TemplateDefinition;
    } catch (error) {
      throw new Error(`Failed to load template definition for ${templateName}: ${error}`);
    }
  }

  private applyVariableSubstitution(
    templateDef: TemplateDefinition,
    userRequirements: UserRequirements
  ): Record<string, string> {
    const variables = { ...templateDef.variables };

    // Replace template variables with user requirements
    Object.keys(variables).forEach(key => {
      let value = variables[key];

      // Replace {{jtbd_description}} with actual JTBD
      value = value.replace(/\{\{jtbd_description\}\}/g, userRequirements.jtbds);

      // Replace visual style variables
      value = value.replace(/\{\{visual_style\.(\w+)\}\}/g, (match, prop) => {
        const styleValue = userRequirements.visual_style[prop as keyof typeof userRequirements.visual_style];
        return Array.isArray(styleValue) ? styleValue.join(', ') : (styleValue || '');
      });

      variables[key] = value;
    });

    return variables;
  }

  private async generateUICustomization(
    templateDef: TemplateDefinition,
    userRequirements: UserRequirements,
    variables: Record<string, string>
  ): Promise<string> {
    const prompt = this.interpolatePrompt(templateDef.customization_prompts.ui_generation, variables, userRequirements);

    // Use Google AI Studio for UI generation
    const uiResult = await generateUIWithGoogle(this.env, "gemini-2.0-pro-exp", prompt);
    return uiResult.files?.[0]?.content || "/* UI customization failed */";
  }

  private async generateFunctionalityCustomization(
    templateDef: TemplateDefinition,
    userRequirements: UserRequirements,
    variables: Record<string, string>
  ): Promise<string> {
    const prompt = this.interpolatePrompt(templateDef.customization_prompts.functionality, variables, userRequirements);

    // Use appropriate LLM for functionality
    const llmChoice = this.selectLLMForCustomization(userRequirements);
    return await callLLM(this.env, prompt, llmChoice);
  }

  private interpolatePrompt(
    prompt: string,
    variables: Record<string, string>,
    userRequirements: UserRequirements
  ): string {
    let interpolated = prompt;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      interpolated = interpolated.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
    });

    // Replace user requirement placeholders
    interpolated = interpolated.replace(/\{\{jtbd_description\}\}/g, userRequirements.jtbds);
    interpolated = interpolated.replace(/\{\{input_sources\}\}/g, userRequirements.input_sources.join(', '));
    interpolated = interpolated.replace(/\{\{outputs\}\}/g, userRequirements.outputs.join(', '));
    interpolated = interpolated.replace(/\{\{api_keys_required\}\}/g, userRequirements.api_keys_required.join(', '));

    return interpolated;
  }

  private selectLLMForCustomization(userRequirements: UserRequirements): LLMChoice {
    // Use the LLM selected by user, fallback to Gemini
    const primaryModel = userRequirements.llm_models?.primary || 'gemini-2.0-pro-exp';

    const provider = (primaryModel.includes('gemini') ? 'googleai' :
                     primaryModel.includes('claude') ? 'anthropic' :
                     primaryModel.includes('gpt') ? 'openai' : 'googleai') as Provider;

    return {
      provider,
      model: primaryModel,
      reason: 'user_selected_model'
    };
  }

  private applyPackagePatches(
    templateDef: TemplateDefinition,
    userRequirements: UserRequirements
  ): any {
    const patches = { ...templateDef.package_patches };

    // Add API-specific dependencies based on user requirements
    if (userRequirements.api_keys_required.includes('openai')) {
      patches.dependencies = {
        ...patches.dependencies,
        'openai': '^4.0.0'
      };
    }

    if (userRequirements.api_keys_required.includes('anthropic')) {
      patches.dependencies = {
        ...patches.dependencies,
        '@anthropic-ai/sdk': '^0.17.0'
      };
    }

    return patches;
  }

  private generateFinalAppStructure(
    templateDef: TemplateDefinition,
    customizations: any
  ): any {
    return {
      name: templateDef.name,
      framework: templateDef.framework,
      files: {
        'package.json': this.generatePackageJson(templateDef, customizations),
        'src/App.tsx': customizations.uiCustomization,
        'src/main.tsx': this.generateMainTsx(templateDef),
        'src/index.css': this.generateIndexCss(customizations),
        'vite.config.ts': this.generateViteConfig(templateDef),
        'tsconfig.json': this.generateTsConfig(),
        'index.html': this.generateIndexHtml(templateDef, customizations)
      },
      deployment: templateDef.deployment,
      connections: templateDef.connections,
      metadata: {
        template: templateDef.name,
        customized: true,
        user_requirements: customizations.userRequirements,
        generated_at: new Date().toISOString()
      }
    };
  }

  private generatePackageJson(templateDef: TemplateDefinition, customizations: any): string {
    const basePackage = {
      name: `custom-${templateDef.name}`,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        ...customizations.packagePatches?.dependencies
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "@vitejs/plugin-react": "^4.0.0",
        typescript: "^5.0.0",
        vite: "^4.0.0",
        ...customizations.packagePatches?.devDependencies
      }
    };

    return JSON.stringify(basePackage, null, 2);
  }

  private generateMainTsx(templateDef: TemplateDefinition): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  private generateIndexCss(customizations: any): string {
    const theme = customizations.userRequirements.visual_style.theme;
    const primaryColor = customizations.customizedVars.primary_color || '#3498db';

    return `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: ${theme === 'dark' ? '#1a1a1a' : '#f8f9fa'};
  color: ${theme === 'dark' ? '#f4f4f4' : '#212529'};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}

#root {
  min-height: 100vh;
}

button {
  background: ${primaryColor};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  opacity: 0.9;
}

input, textarea {
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

input:focus, textarea:focus {
  outline: none;
  border-color: ${primaryColor};
}`;
  }

  private generateViteConfig(templateDef: TemplateDefinition): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`;
  }

  private generateTsConfig(): string {
    return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;
  }

  private generateIndexHtml(templateDef: TemplateDefinition, customizations: any): string {
    const title = customizations.customizedVars.app_title || templateDef.name;
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }
}

export function createTemplateCustomizer(env: EnvReq & { AGENT_STATE: DurableObjectNamespace }) {
  return new TemplateCustomizer(env);
}