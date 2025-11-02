// src/services/qa.ts
// Codr — Advanced Quality Assurance for generated code

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  column?: number;
  rule?: string;
}

export interface QAReport {
  passed: boolean;
  issues: CodeIssue[];
  score: number; // 0-100
  summary: {
    errors: number;
    warnings: number;
    suggestions: number;
  };
}

export class QualityAssurance {
  constructor(private env: any) {}

  async analyzeCode(files: Array<{ path: string; content: string }>): Promise<QAReport> {
    const issues: CodeIssue[] = [];

    // Run multiple analysis types
    const lintResults = await this.runLinting(files);
    const typeResults = await this.runTypeChecking(files);
    const securityResults = await this.runSecurityScan(files);
    const performanceResults = await this.runPerformanceCheck(files);

    issues.push(...lintResults, ...typeResults, ...securityResults, ...performanceResults);

    // Calculate score based on issues
    const score = this.calculateScore(issues);

    return {
      passed: score >= 70, // 70% or higher to pass
      issues,
      score,
      summary: {
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        suggestions: issues.filter(i => i.type === 'info').length
      }
    };
  }

  private async runLinting(files: Array<{ path: string; content: string }>): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    for (const file of files) {
      if (file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
        // Basic linting checks
        const content = file.content;

        // Check for console.log statements
        if (content.includes('console.log')) {
          issues.push({
            type: 'warning',
            message: 'console.log statement found - remove for production',
            file: file.path,
            rule: 'no-console'
          });
        }

        // Check for unused variables (basic regex check)
        const unusedVarMatches = content.match(/const\s+(\w+)\s*=/g);
        if (unusedVarMatches) {
          // This is a simplified check - real linting would be more sophisticated
          issues.push({
            type: 'info',
            message: 'Consider checking for unused variables',
            file: file.path,
            rule: 'no-unused-vars'
          });
        }
      }
    }

    return issues;
  }

  private async runTypeChecking(files: Array<{ path: string; content: string }>): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    for (const file of files) {
      if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
        const content = file.content;

        // Check for any type: any usage
        if (content.includes(': any')) {
          issues.push({
            type: 'warning',
            message: 'Avoid using "any" type - use specific types instead',
            file: file.path,
            rule: 'no-any'
          });
        }

        // Check for missing return types on functions
        const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*{/g);
        if (functionMatches) {
          issues.push({
            type: 'info',
            message: 'Consider adding return types to functions',
            file: file.path,
            rule: 'typedef'
          });
        }
      }
    }

    return issues;
  }

  private async runSecurityScan(files: Array<{ path: string; content: string }>): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    for (const file of files) {
      const content = file.content;

      // Check for eval usage
      if (content.includes('eval(')) {
        issues.push({
          type: 'error',
          message: 'Use of eval() is a security risk',
          file: file.path,
          rule: 'no-eval'
        });
      }

      // Check for innerHTML usage
      if (content.includes('innerHTML')) {
        issues.push({
          type: 'warning',
          message: 'innerHTML can be vulnerable to XSS - use textContent or sanitize input',
          file: file.path,
          rule: 'no-inner-html'
        });
      }

      // Check for hardcoded secrets (basic check)
      if (content.match(/api[_-]?key|secret|token/i) && content.match(/['"`][a-zA-Z0-9_-]{20,}['"`]/)) {
        issues.push({
          type: 'error',
          message: 'Potential hardcoded secret detected',
          file: file.path,
          rule: 'no-hardcoded-secrets'
        });
      }
    }

    return issues;
  }

  private async runPerformanceCheck(files: Array<{ path: string; content: string }>): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    for (const file of files) {
      const content = file.content;

      // Check bundle size indicators
      if (content.length > 50000) { // 50KB threshold
        issues.push({
          type: 'warning',
          message: 'Large file detected - consider code splitting',
          file: file.path,
          rule: 'bundle-size'
        });
      }

      // Check for inefficient patterns
      if (content.includes('.forEach') && content.includes('=>')) {
        issues.push({
          type: 'info',
          message: 'Consider using for...of loops for better performance',
          file: file.path,
          rule: 'performance'
        });
      }
    }

    return issues;
  }

  private calculateScore(issues: CodeIssue[]): number {
    if (issues.length === 0) return 100;

    const errorWeight = 10;
    const warningWeight = 3;
    const infoWeight = 1;

    const totalPenalty = issues.reduce((sum, issue) => {
      switch (issue.type) {
        case 'error': return sum + errorWeight;
        case 'warning': return sum + warningWeight;
        case 'info': return sum + infoWeight;
        default: return sum;
      }
    }, 0);

    // Max penalty of 50 points
    const penalty = Math.min(totalPenalty, 50);
    return Math.max(0, 100 - penalty);
  }

  async fixIssues(files: Array<{ path: string; content: string }>, issues: CodeIssue[]): Promise<Array<{ path: string; content: string }>> {
    // This would use AI to automatically fix issues
    // For now, return the original files
    console.log(`Would attempt to fix ${issues.length} issues`);
    return files;
  }
}

// Factory function
export function createQualityAssurance(env: any): QualityAssurance {
  return new QualityAssurance(env);
}