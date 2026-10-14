import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

/**
 * Code Quality Analyzer Agent
 *
 * Analyzes code for security vulnerabilities, performance issues,
 * and maintainability concerns.
 *
 * Tools:
 * - Read: Read source files
 * - Grep: Search for code patterns
 * - Glob: Find files matching patterns
 * - Skill: Invoke Claude skills for specialized analysis
 */
export const codeQualityAnalyzer: AgentDefinition = {
  description: 'Analyzes code for security vulnerabilities, performance bottlenecks, and maintainability concerns.',
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  prompt: CODE_QUALITY_ANALYZER_PROMPT
};
