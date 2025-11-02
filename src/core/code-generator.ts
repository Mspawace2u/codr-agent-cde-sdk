// src/core/code-generator.ts
// Codr — Phase-based code generation using Google AI Studio

import { generateUIWithGoogle, callLLM, pickLLMForJTBD, type EnvReq } from "../lib/llm";
import { AgentStateDO } from "../do/AgentStateDO";
import { getTemplate, getTemplatesByFramework } from "../../templates/index.js";

export interface CodeGenerationRequest {
  name: string;
  jtbds: string;
  input_sources: string[];
  outputs: string[];
  api_keys_required: string[];
  visual_style: {
    theme: string;
    color: string;
    font: string;
    vibe: string;
    motion: string;
    favorite_app?: string;
    screenshots?: string[];
  };
  frontend_framework: "react" | "vite";
  llm_models?: Record<string, string>;
}

export interface GeneratedFile {
  path: string;
  content: string;
  phase: string;
}

export interface GenerationResult {
  files: GeneratedFile[];
  preview_url?: string;
  deployment_id?: string;
  build_result?: any;
}

export class CodeGenerator {
  constructor(private env: EnvReq & { AGENT_STATE: DurableObjectNamespace }) {}

  async generateApp(request: CodeGenerationRequest, agentId: string): Promise<GenerationResult> {
    const phases = [
      { name: "planning", description: "Analyze requirements and create project structure" },
      { name: "foundation", description: "Generate package.json, config files, and basic setup" },
      { name: "core", description: "Create main components and business logic" },
      { name: "styling", description: "Add CSS, themes, and visual design" },
      { name: "integration", description: "Connect APIs and external services" },
      { name: "optimization", description: "Performance improvements and error handling" }
    ];

    const allFiles: GeneratedFile[] = [];
    let currentPhase = 0;

    // Get Durable Object for state management
    const agentStub = this.env.AGENT_STATE.get(this.env.AGENT_STATE.idFromName(agentId));

    for (const phase of phases) {
      try {
        // Update progress
        await agentStub.fetch("https://do/progress", {
          method: "POST",
          body: JSON.stringify({
            phase: phase.name,
            progress: (currentPhase / phases.length) * 100,
            status: "generating"
          })
        });

        const phaseFiles = await this.generatePhase(request, phase.name, allFiles);
        allFiles.push(...phaseFiles);

        currentPhase++;
      } catch (error) {
        console.error(`Phase ${phase.name} failed:`, error);
        // Continue with next phase or implement error recovery
      }
    }

    // Build the generated application
    console.log(`Building generated app for ${request.name}`);
    const buildResult = await this.buildGeneratedApp(allFiles, request, agentId);

    // Generate preview and deployment
    const result = await this.createPreviewAndDeploy(allFiles, buildResult, request, agentId);

    // Mark as complete
    await agentStub.fetch("https://do/progress", {
      method: "POST",
      body: JSON.stringify({
        phase: "complete",
        progress: 100,
        status: "completed",
        result
      })
    });

    return result;
  }

  private async generatePhase(
    request: CodeGenerationRequest,
    phase: string,
    previousFiles: GeneratedFile[]
  ): Promise<GeneratedFile[]> {
    const llmChoice = pickLLMForJTBD(request.jtbds);

    let prompt = this.buildPhasePrompt(request, phase, previousFiles);

    if (phase === "planning") {
      // Use general LLM for planning
      const response = await callLLM(this.env, prompt, llmChoice);
      return this.parsePlanningResponse(response, phase);
    } else if (phase.includes("ui") || phase === "styling") {
      // Use Google AI Studio for UI generation
      const uiResult = await generateUIWithGoogle(this.env, "gemini-2.0-pro-exp", prompt);
      return uiResult.files.map(f => ({ ...f, phase }));
    } else {
      // Use appropriate LLM for other phases
      const response = await callLLM(this.env, prompt, llmChoice);
      return this.parseCodeResponse(response, phase);
    }
  }

  private buildPhasePrompt(
    request: CodeGenerationRequest,
    phase: string,
    previousFiles: GeneratedFile[]
  ): string {
    const baseContext = `
Create a ${request.frontend_framework} application with these requirements:
- Name: ${request.name}
- Purpose: ${request.jtbds}
- Inputs: ${request.input_sources.join(", ")}
- Outputs: ${request.outputs.join(", ")}
- Required APIs: ${request.api_keys_required.join(", ")}
- Visual Style: ${JSON.stringify(request.visual_style, null, 2)}

Previous files generated:
${previousFiles.map(f => `- ${f.path} (${f.phase})`).join("\n")}
    `;

    switch (phase) {
      case "planning":
        return `${baseContext}

Create a detailed project structure and file list for this application. Return as JSON:
{
  "structure": {
    "src/": ["components/", "utils/", "types/"],
    "public/": ["index.html", "assets/"],
    "package.json": "dependencies and scripts"
  },
  "files": [
    {"path": "src/main.tsx", "description": "Entry point"},
    {"path": "src/App.tsx", "description": "Main component"}
  ]
}`;

      case "foundation":
        return `${baseContext}

Generate the foundation files for this ${request.frontend_framework} app:
- package.json with all necessary dependencies
- tsconfig.json
- vite.config.ts (if using Vite)
- index.html
- main.tsx entry point
- Basic App component structure

Return as JSON array of files with path and content.`;

      case "core":
        return `${baseContext}

Generate the core functionality:
- Main components based on the JTBD
- Business logic
- State management
- API integration points

Focus on the core user workflow described in the requirements.`;

      case "styling":
        return `${baseContext}

Generate styling based on visual preferences:
- Theme: ${request.visual_style.theme}
- Color palette: ${request.visual_style.color}
- Font: ${request.visual_style.font}
- Design vibe: ${request.visual_style.vibe}
- Motion: ${request.visual_style.motion}

Create CSS files, Tailwind config, and styled components.`;

      case "integration":
        return `${baseContext}

Add API integrations and external services:
${request.api_keys_required.map(api => `- ${api} integration`).join("\n")}

Create service files, API clients, and connection logic.`;

      case "optimization":
        return `${baseContext}

Add optimizations:
- Error boundaries
- Loading states
- Performance improvements
- Type safety
- Testing setup`;

      default:
        return baseContext;
    }
  }

  private parsePlanningResponse(response: string, phase: string): GeneratedFile[] {
    try {
      const data = JSON.parse(response);
      // Convert planning data to actual file structure
      return [
        {
          path: "project-structure.json",
          content: JSON.stringify(data, null, 2),
          phase
        }
      ];
    } catch {
      return [{
        path: "planning-notes.txt",
        content: response,
        phase
      }];
    }
  }

  private parseCodeResponse(response: string, phase: string): GeneratedFile[] {
    try {
      // Try to parse as JSON array of files
      const files = JSON.parse(response);
      if (Array.isArray(files)) {
        return files.map((f: any) => ({
          path: f.path || `phase-${phase}.txt`,
          content: f.content || f,
          phase
        }));
      }
    } catch {}

    // Fallback: treat as single file content
    return [{
      path: `phase-${phase}.tsx`,
      content: response,
      phase
    }];
  }

  private async buildGeneratedApp(
    files: GeneratedFile[],
    request: CodeGenerationRequest,
    agentId: string
  ): Promise<any> {
    // Use the build service to compile the generated app
    const { createBuildService } = await import("../services/build");
    const buildService = createBuildService(this.env);

    const buildRequest = {
      appId: agentId,
      files: files.map(f => ({ path: f.path, content: f.content })),
      framework: request.frontend_framework,
      dependencies: {} // Could be extended to include detected dependencies
    };

    const buildResult = await buildService.buildApp(buildRequest);
    return buildResult;
  }

  private async createPreviewAndDeploy(
    files: GeneratedFile[],
    buildResult: any,
    request: CodeGenerationRequest,
    agentId: string
  ): Promise<GenerationResult> {
    // Store build assets in R2
    if (buildResult.success && buildResult.assets) {
      for (const asset of buildResult.assets) {
        await this.env.AGENT_ASSETS.put(
          `apps/${agentId}/${asset.path}`,
          asset.content,
          {
            httpMetadata: {
              contentType: asset.type === 'html' ? 'text/html' :
                          asset.type === 'js' ? 'application/javascript' :
                          asset.type === 'css' ? 'text/css' : 'text/plain'
            }
          }
        );
      }
    }

    const previewUrl = `https://${agentId}.yourdomain.com`;

    return {
      files,
      preview_url: previewUrl,
      deployment_id: agentId,
      build_result: buildResult
    };
  }
}

// Export factory function
export function createCodeGenerator(env: EnvReq & { AGENT_STATE: DurableObjectNamespace }) {
  return new CodeGenerator(env);
}