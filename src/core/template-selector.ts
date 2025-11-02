// src/core/template-selector.ts
// JTBD-based template selection with AI fallback generation

import { pickLLMForJTBD, callLLM, type EnvReq } from "../lib/llm";
import { createTemplateCustomizer, type UserRequirements } from "./template-customizer";
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

export interface TemplateMatch {
  templateName: string;
  confidence: number;
  reasoning: string;
  capabilities: string[];
}

export interface TemplateSelectionResult {
  selectedTemplate?: string;
  fallbackGeneration?: boolean;
  reasoning: string;
  alternatives?: TemplateMatch[];
}

export class TemplateSelector {
  constructor(private env: EnvReq & { AGENT_STATE: DurableObjectNamespace }) {}

  async selectTemplateForJTBD(userRequirements: UserRequirements): Promise<TemplateSelectionResult> {
    const availableTemplates = this.getAvailableTemplates();

    // Score each template against user requirements
    const matches = availableTemplates.map(template => ({
      templateName: template.name,
      confidence: this.calculateTemplateMatch(template, userRequirements),
      reasoning: this.generateMatchReasoning(template, userRequirements),
      capabilities: Object.keys(template.capabilities).filter(k => template.capabilities[k])
    }));

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = matches[0];

    // If confidence is high enough, use the template
    if (bestMatch.confidence >= 0.7) {
      return {
        selectedTemplate: bestMatch.templateName,
        reasoning: bestMatch.reasoning,
        alternatives: matches.slice(1, 4) // Top 3 alternatives
      };
    }

    // Otherwise, fall back to AI generation
    return {
      fallbackGeneration: true,
      reasoning: `No template matches well enough (best confidence: ${(bestMatch.confidence * 100).toFixed(1)}%). Will generate custom app using AI.`,
      alternatives: matches.slice(0, 3)
    };
  }

  private getAvailableTemplates(): any[] {
    try {
      const definitionsDir = join(process.cwd(), 'templates', 'definitions');
      const files = readdirSync(definitionsDir).filter(f => f.endsWith('.yaml'));

      return files.map(file => {
        const yamlPath = join(definitionsDir, file);
        const content = readFileSync(yamlPath, 'utf8');
        return YAML.parse(content);
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  private calculateTemplateMatch(template: any, requirements: UserRequirements): number {
    let score = 0;
    let maxScore = 0;

    // JTBD keyword matching
    const jtbd = requirements.jtbds.toLowerCase();
    maxScore += 30;

    if (jtbd.includes('journal') && template.name.includes('journal')) score += 30;
    else if (jtbd.includes('idea') && template.name.includes('idea')) score += 30;
    else if (jtbd.includes('dashboard') && template.name.includes('dashboard')) score += 30;
    else if (jtbd.includes('track') && template.capabilities.workflow_management) score += 20;
    else if (jtbd.includes('manage') && template.capabilities.workflow_management) score += 20;

    // Input source matching
    maxScore += 20;
    const inputMatches = requirements.input_sources.filter(input =>
      this.templateSupportsInput(template, input)
    ).length;
    score += (inputMatches / requirements.input_sources.length) * 20;

    // Output matching
    maxScore += 20;
    const outputMatches = requirements.outputs.filter(output =>
      this.templateSupportsOutput(template, output)
    ).length;
    score += (outputMatches / requirements.outputs.length) * 20;

    // API requirements
    maxScore += 15;
    const apiMatches = requirements.api_keys_required.filter(api =>
      this.templateSupportsAPI(template, api)
    ).length;
    score += (apiMatches / requirements.api_keys_required.length) * 15;

    // Framework preference (if specified)
    maxScore += 10;
    if (requirements.visual_style.favorite_app) {
      // Simple heuristic based on favorite app
      const favorite = requirements.visual_style.favorite_app.toLowerCase();
      if (favorite.includes('notion') && template.framework === 'react') score += 10;
      else if (favorite.includes('figma') && template.capabilities.data_visualization) score += 10;
    }

    // Complexity matching
    maxScore += 5;
    // Simple templates for simple JTBDs, complex for complex ones
    const jtbdComplexity = this.assessJTBDComplexity(requirements);
    if (jtbdComplexity === template.complexity) score += 5;

    return Math.min(score / maxScore, 1.0);
  }

  private templateSupportsInput(template: any, input: string): boolean {
    const inputMap: Record<string, string[]> = {
      'gdrive': ['file_upload'],
      'dropbox': ['file_upload'],
      'notion': ['api_import'],
      'web': ['url_import'],
      'upload': ['file_upload'],
      'email': ['api_import'],
      'other': ['api_import']
    };

    const requiredCapabilities = inputMap[input.toLowerCase()] || [];
    return requiredCapabilities.some(cap => template.capabilities[cap]);
  }

  private templateSupportsOutput(template: any, output: string): boolean {
    const outputMap: Record<string, string[]> = {
      'summary': ['data_storage', 'reporting'],
      'doc': ['export'],
      'json': ['export'],
      'post': ['api_import'],
      'slides': ['export'],
      'audio': ['export'],
      'video': ['export'],
      'image': ['export'],
      'trigger': ['webhook']
    };

    const requiredCapabilities = outputMap[output.toLowerCase()] || [];
    return requiredCapabilities.some(cap => template.capabilities[cap]);
  }

  private templateSupportsAPI(template: any, api: string): boolean {
    if (!template.api_integrations) return false;

    return template.api_integrations.some((integration: any) => {
      if (integration.providers) {
        return integration.providers.includes(api.toLowerCase());
      }
      return false;
    });
  }

  private assessJTBDComplexity(requirements: UserRequirements): 'simple' | 'medium' | 'complex' {
    const factors = [
      requirements.input_sources.length > 2,
      requirements.outputs.length > 2,
      requirements.api_keys_required.length > 1,
      requirements.jtbds.length > 100
    ];

    const complexityScore = factors.filter(Boolean).length;

    if (complexityScore <= 1) return 'simple';
    if (complexityScore <= 3) return 'medium';
    return 'complex';
  }

  private generateMatchReasoning(template: any, requirements: UserRequirements): string {
    const reasons = [];

    if (requirements.jtbds.toLowerCase().includes(template.name.split('-')[0])) {
      reasons.push(`JTBD mentions "${template.name.split('-')[0]}" functionality`);
    }

    const inputMatches = requirements.input_sources.filter(input =>
      this.templateSupportsInput(template, input)
    );
    if (inputMatches.length > 0) {
      reasons.push(`Supports ${inputMatches.length} of your input sources`);
    }

    const outputMatches = requirements.outputs.filter(output =>
      this.templateSupportsOutput(template, output)
    );
    if (outputMatches.length > 0) {
      reasons.push(`Supports ${outputMatches.length} of your output types`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'General purpose template';
  }

  async generateCustomTemplate(userRequirements: UserRequirements, agentId: string): Promise<any> {
    // Use AI to generate a completely custom template
    const llmChoice = pickLLMForJTBD(userRequirements.jtbds);

    const prompt = `
Create a custom app template based on these requirements:

JTBD: ${userRequirements.jtbds}
Inputs: ${userRequirements.input_sources.join(', ')}
Outputs: ${userRequirements.outputs.join(', ')}
APIs: ${userRequirements.api_keys_required.join(', ')}
Style: ${JSON.stringify(userRequirements.visual_style)}

Generate a complete app structure with:
1. package.json with appropriate dependencies
2. Main React component (App.tsx)
3. Supporting components and utilities
4. CSS styling matching the visual preferences
5. Any necessary configuration files

Return the complete file structure as a JSON object with file paths as keys and content as values.
`;

    const response = await callLLM(this.env, prompt, llmChoice);

    try {
      const customApp = JSON.parse(response);
      return {
        ...customApp,
        metadata: {
          generated: true,
          user_requirements: userRequirements,
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      // Fallback: generate a basic structure
      return this.generateFallbackApp(userRequirements);
    }
  }

  private generateFallbackApp(userRequirements: UserRequirements): any {
    const customizer = createTemplateCustomizer(this.env);

    // Use the most flexible template as base and heavily customize it
    return customizer.customizeTemplate('journal-app', userRequirements, 'fallback-agent');
  }

  async templatizeGeneratedApp(generatedApp: any, templateName: string): Promise<void> {
    // Extract common patterns and create a reusable template
    const templateDef = this.extractTemplateDefinition(generatedApp, templateName);

    // Save as YAML definition
    const yamlPath = join(process.cwd(), 'templates', 'definitions', `${templateName}.yaml`);
    const yamlContent = YAML.stringify(templateDef);

    // Note: In a real implementation, you'd write this to disk
    console.log(`Template ${templateName} would be saved to: ${yamlPath}`);
    console.log('YAML Content:', yamlContent);
  }

  private extractTemplateDefinition(generatedApp: any, templateName: string): any {
    // Analyze the generated app and extract template patterns
    return {
      name: templateName,
      description: `Custom template for ${templateName}`,
      category: 'custom',
      framework: 'react',
      complexity: 'medium',
      capabilities: {
        custom_generated: true,
        // Extract capabilities from generated app analysis
      },
      variables: {
        app_title: '{{jtbd_description}}',
        // Extract other variables
      },
      customization_prompts: {
        ui_generation: 'Custom UI generation prompt',
        functionality: 'Custom functionality prompt'
      },
      deployment: {
        worker_type: 'pages',
        routing: 'subdomain',
        database: 'local_storage',
        assets: 'inline'
      }
    };
  }
}

export function createTemplateSelector(env: EnvReq & { AGENT_STATE: DurableObjectNamespace }) {
  return new TemplateSelector(env);
}