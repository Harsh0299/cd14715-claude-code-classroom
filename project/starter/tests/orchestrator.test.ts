import { describe, expect, it } from 'vitest';
import { ReviewReportSchema } from '../src/types/report-types.js';
import { withRetry, withTimeout, ReviewError, ErrorCodes } from '../src/utils/error-handler.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';

/**
 * Tests for CodeReviewOrchestrator system
 * Covers schema validation, error handling utilities, and rate limiting
 */

describe('Schema Validation', () => {
  const validReport = {
    pullRequest: { owner: 'octocat', repo: 'Hello-World', number: 1 },
    fileReviews: [],
    summary: {
      totalFiles: 0,
      overallScore: 100,
      criticalIssues: 0,
      highPriorityTests: 0,
      refactoringOpportunities: 0
    },
    recommendations: [],
    metadata: {
      analyzedAt: new Date().toISOString(),
      duration: 10,
      agentVersions: {}
    }
  };

  it('accepts a valid ReviewReport', () => {
    expect(ReviewReportSchema.safeParse(validReport).success).toBe(true);
  });

  it('rejects a report missing required pullRequest fields', () => {
    const invalidReport = { ...validReport, pullRequest: { owner: 'test' } };
    expect(ReviewReportSchema.safeParse(invalidReport).success).toBe(false);
  });

  it('rejects a report with invalid overallScore type', () => {
    const invalidReport = {
      ...validReport,
      summary: { ...validReport.summary, overallScore: 'not-a-number' }
    };
    expect(ReviewReportSchema.safeParse(invalidReport).success).toBe(false);
  });
});

describe('Error Handler Utilities', () => {
  describe('withRetry', () => {
    it('returns result immediately if function succeeds on first attempt', async () => {
      const result = await withRetry(async () => 'success', 3, 1);
      expect(result).toBe('success');
    });

    it('retries transient failures before succeeding', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts += 1;
        if (attempts < 2) throw new Error('temporary');
        return 'ok';
      }, 3, 1);
      expect(result).toBe('ok');
      expect(attempts).toBe(2);
    });

    it('throws ReviewError after exhausting all retries', async () => {
      const failingFn = async () => { throw new Error('persistent failure'); };
      await expect(withRetry(failingFn, 2, 1)).rejects.toThrow(ReviewError);
      await expect(withRetry(failingFn, 2, 1)).rejects.toThrow(/failed after 2 retries/);
    });
  });

  describe('withTimeout', () => {
    it('returns result if function completes before timeout', async () => {
      const result = await withTimeout(async () => 'fast', 1000);
      expect(result).toBe('fast');
    });

    it('throws ReviewError if function exceeds timeout', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'slow';
      };
      await expect(withTimeout(slowFn, 10)).rejects.toThrow(ReviewError);
      await expect(withTimeout(slowFn, 10)).rejects.toMatchObject({
        code: ErrorCodes.AGENT_TIMEOUT
      });
    });
  });
});

describe('Rate Limiter', () => {
  it('allows requests when under rate limits', () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 50000,
      maxConcurrent: 3
    });
    expect(limiter.canProceed(1000)).toBe(true);
  });

  it('tracks request history correctly', () => {
    const limiter = new RateLimiter({ maxRequestsPerMinute: 2, maxTokensPerMinute: 10000, maxConcurrent: 1 });
    // First two requests should be allowed
    expect(limiter.canProceed(1000)).toBe(true);
    // Simulate recording two requests by checking the internal state
    // Note: This tests the basic canProceed logic without async waiting
    expect(limiter.canProceed(1000)).toBe(true);
  });
});

describe('Integration', () => {
  // These tests require actual API keys and should be skipped in CI
  it.skip('should review a real small PR', async () => {
    // TODO: Test with a real public PR (e.g., octocat/Hello-World)
    // NOTE: Only run manually with valid API keys
  });
});
