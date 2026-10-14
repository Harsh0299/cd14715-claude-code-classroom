import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

/**
 * Refactoring Suggester Agent
 *
 * Identifies opportunities to improve code structure through refactoring.
 * Suggests design patterns, modernization, and simplification opportunities.
 *
 * Tools:
 * - Read: Read source files to analyze structure
 * - Grep: Search for code patterns and anti-patterns
 * - Glob: Find related files for context
 */
export const refactoringSuggester: AgentDefinition = {
  description: 'Identifies refactoring opportunities to improve code structure, apply modern patterns, and enhance maintainability with specific before/after examples.',
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  prompt: REFACTORING_SUGGESTER_PROMPT
};
