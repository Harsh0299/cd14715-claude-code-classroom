import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

/**
 * Test Coverage Analyzer Agent
 *
 * Evaluates test completeness by comparing source files with test files.
 * Identifies untested functions, branches, and edge cases.
 *
 * Tools:
 * - Read: Read source and test files
 * - Grep: Search for test patterns and function definitions
 * - Glob: Find test files matching naming conventions
 */
export const testCoverageAnalyzer: AgentDefinition = {
  description: 'Evaluates test coverage completeness by identifying untested functions, branches, and edge cases, then suggests specific test scenarios.',
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  prompt: TEST_COVERAGE_ANALYZER_PROMPT
};
