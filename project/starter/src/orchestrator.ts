import { query } from '@anthropic-ai/claude-agent-sdk';
import { ReviewReport, ReviewReportSchema } from './types/report-types.js';
import { ReviewReportJSONSchema } from './types/index.js';
import { buildOrchestratorPrompt } from './prompts/orchestrator.prompt.js';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from './agents/index.js';
import { mcpServersConfig } from './config/mcp.config.js';
import { logger, logReviewStart, logReviewComplete, logReviewError } from './utils/logger.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  model?: string;
  maxTurns?: number;
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private model: string;
  private maxTurns: number;

  constructor(options: OrchestratorOptions = {}) {
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    this.maxTurns = options.maxTurns || 50; // Allow enough turns for multi-agent coordination
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startTime = Date.now();
    logReviewStart(owner, repo, prNumber);

    try {
      // Build the orchestrator prompt with PR details
      const prompt = buildOrchestratorPrompt(owner, repo, prNumber);

      // Configure the query with all subagents, MCP servers, and structured output
      const result = query({
        prompt,
        options: {
          model: this.model,
          maxTurns: this.maxTurns,

          // Register all three subagents
          agents: {
            'code-quality-analyzer': codeQualityAnalyzer,
            'test-coverage-analyzer': testCoverageAnalyzer,
            'refactoring-suggester': refactoringSuggester
          },

          // Configure MCP servers for GitHub and ESLint access
          mcpServers: mcpServersConfig,

          // Include Task tool to spawn subagents and MCP tools for GitHub/ESLint
          allowedTools: [
            'Task',
            'Read',
            'Grep',
            'Glob',
            'mcp__github__pull_request_read',
            'mcp__github__get_pull_request_files',
            'mcp__eslint__lint'
          ],

          // Configure structured output for ReviewReport
          outputFormat: {
            type: 'json_schema',
            schema: ReviewReportJSONSchema
          },

          // Don't prompt for permissions in automated mode
          permissionMode: 'dontAsk'
        }
      });

      // Iterate through the async generator to get the final result
      let finalOutput: ReviewReport | null = null;

      for await (const message of result) {
        // Extract the structured output from the result message
        if (message.type === 'result') {
          if (message.subtype === 'success' && message.structured_output) {
            finalOutput = message.structured_output as ReviewReport;
          } else if (message.subtype !== 'success') {
            throw new Error(`Query failed with subtype: ${message.subtype}`);
          }
        }
      }

      // Validate the final output matches our schema
      if (!finalOutput) {
        throw new Error('No structured output received from orchestrator');
      }

      const parseResult = ReviewReportSchema.safeParse(finalOutput);

      if (!parseResult.success) {
        logger.error('Schema validation failed', {
          errors: parseResult.error.errors,
          output: finalOutput
        });
        throw new Error(`Invalid review report structure: ${parseResult.error.message}`);
      }

      const duration = Date.now() - startTime;
      logReviewComplete(owner, repo, prNumber, parseResult.data.summary.overallScore, duration);

      return parseResult.data;

    } catch (error) {
      const duration = Date.now() - startTime;
      logReviewError(owner, repo, prNumber, error as Error);
      throw error;
    }
  }
}
