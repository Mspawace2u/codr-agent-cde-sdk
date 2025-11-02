// src/services/sandbox.ts
// Codr — Container-based sandbox service for live previews and execution

export interface SandboxConfig {
  sessionId: string;
  agentId: string;
  instanceType?: string;
  maxInstances?: number;
}

export interface PreviewResult {
  success: boolean;
  previewUrl?: string;
  containerId?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface DeploymentResult {
  success: boolean;
  deployedUrl?: string;
  deploymentId?: string;
  error?: string;
}

export class SandboxService {
  private activeContainers = new Map<string, ContainerInstance>();
  private maxInstances: number;

  constructor(private config: SandboxConfig) {
    this.maxInstances = config.maxInstances || 10;
  }

  async createPreview(files: Array<{ path: string; content: string }>): Promise<PreviewResult> {
    try {
      // Check instance limits
      if (this.activeContainers.size >= this.maxInstances) {
        return {
          success: false,
          error: 'Maximum sandbox instances reached'
        };
      }

      const containerId = `preview-${this.config.agentId}-${Date.now()}`;
      const container = new ContainerInstance(containerId, this.config.instanceType || 'standard-3');

      // Initialize container
      await container.initialize();

      // Write files to container
      for (const file of files) {
        await container.writeFile(file.path, file.content);
      }

      // Install dependencies and start dev server
      await container.installDependencies();
      const devProcess = await container.startDevServer();

      // Generate preview URL
      const previewUrl = await container.getPreviewUrl();

      // Store container reference
      this.activeContainers.set(containerId, container);

      return {
        success: true,
        previewUrl,
        containerId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Preview creation failed'
      };
    }
  }

  async executeCode(code: string, language: 'javascript' | 'typescript' | 'python' = 'javascript'): Promise<ExecutionResult> {
    try {
      const containerId = `exec-${this.config.agentId}-${Date.now()}`;
      const container = new ContainerInstance(containerId, 'standard-1');

      await container.initialize();

      // Create execution file
      const fileName = language === 'python' ? 'script.py' : 'script.js';
      await container.writeFile(fileName, code);

      // Execute code
      const result = await container.executeFile(fileName, language);

      // Cleanup
      await container.cleanup();
      this.activeContainers.delete(containerId);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code execution failed'
      };
    }
  }

  async deployToWorkers(files: Array<{ path: string; content: string }>): Promise<DeploymentResult> {
    try {
      const deploymentId = `deploy-${Date.now()}-${this.config.agentId}`;

      // Build the application in container
      const containerId = `build-${deploymentId}`;
      const container = new ContainerInstance(containerId, 'standard-3');

      await container.initialize();

      // Write source files
      for (const file of files) {
        await container.writeFile(file.path, file.content);
      }

      // Build the application
      const buildResult = await container.buildApp();

      if (!buildResult.success) {
        await container.cleanup();
        return {
          success: false,
          error: buildResult.error || 'Build failed'
        };
      }

      // Deploy to Workers for Platforms
      const deployResult = await this.deployToWorkersPlatform(buildResult.assets || [], deploymentId);

      // Cleanup build container
      await container.cleanup();
      this.activeContainers.delete(containerId);

      return deployResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed'
      };
    }
  }

  private async deployToWorkersPlatform(assets: Array<{ path: string; content: string }>, deploymentId: string): Promise<DeploymentResult> {
    // This would integrate with Workers for Platforms API
    // For now, simulate successful deployment

    const deployedUrl = `https://${deploymentId}.workers.dev`;

    return {
      success: true,
      deployedUrl,
      deploymentId
    };
  }

  async cleanup(containerId: string): Promise<void> {
    const container = this.activeContainers.get(containerId);
    if (container) {
      await container.cleanup();
      this.activeContainers.delete(containerId);
    }
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.activeContainers.entries()).map(
      ([containerId, container]) => container.cleanup()
    );

    await Promise.all(cleanupPromises);
    this.activeContainers.clear();
  }

  getActiveContainerCount(): number {
    return this.activeContainers.size;
  }
}

class ContainerInstance {
  constructor(
    private containerId: string,
    private instanceType: string
  ) {}

  async initialize(): Promise<void> {
    // In production, this would create an actual Cloudflare Container
    // For now, simulate initialization
    console.log(`Initializing container ${this.containerId} with type ${this.instanceType}`);
  }

  async writeFile(path: string, content: string): Promise<void> {
    // Simulate writing file to container
    console.log(`Writing file ${path} to container ${this.containerId}`);
  }

  async installDependencies(): Promise<void> {
    // Simulate npm install
    console.log(`Installing dependencies in container ${this.containerId}`);
  }

  async startDevServer(): Promise<{ processId: string }> {
    // Simulate starting dev server
    const processId = `dev-${Date.now()}`;
    console.log(`Starting dev server in container ${this.containerId}, process: ${processId}`);
    return { processId };
  }

  async executeFile(fileName: string, language: string): Promise<ExecutionResult> {
    // Simulate code execution
    console.log(`Executing ${fileName} (${language}) in container ${this.containerId}`);

    return {
      success: true,
      output: 'Code executed successfully',
      exitCode: 0
    };
  }

  async buildApp(): Promise<{ success: boolean; assets?: Array<{ path: string; content: string }>; error?: string }> {
    // Simulate build process
    console.log(`Building app in container ${this.containerId}`);

    return {
      success: true,
      assets: [
        { path: 'index.html', content: '<!DOCTYPE html><html><body><h1>Built App</h1></body></html>' },
        { path: 'assets/app.js', content: 'console.log("App loaded");' }
      ]
    };
  }

  async getPreviewUrl(): Promise<string> {
    // Generate preview URL
    return `https://preview-${this.containerId}.codragents.dev`;
  }

  async cleanup(): Promise<void> {
    // Simulate container cleanup
    console.log(`Cleaning up container ${this.containerId}`);
  }
}

// Factory function
export function createSandboxService(config: SandboxConfig): SandboxService {
  return new SandboxService(config);
}