import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  // Validate command line arguments
  if (!owner || !repo || !prStr) {
    console.error('❌ Error: Missing required arguments');
    console.error('');
    console.error('Usage: npm run dev <owner> <repo> <pr-number>');
    console.error('');
    console.error('Example: npm run dev octocat Hello-World 1');
    process.exit(1);
  }

  // Convert and validate PR number
  const prNumber = Number(prStr);
  if (!/^\d+$/.test(prStr) || !Number.isSafeInteger(prNumber) || prNumber <= 0) {
    console.error(`❌ Error: Invalid PR number '${prStr}'. Must be a positive integer.`);
    console.error('Example: npm run dev octocat Hello-World 1');
    process.exit(1);
  }

  // Validate authentication
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasAwsKeys = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  if (!hasAnthropicKey && !hasAwsKeys) {
    console.error('❌ Error: No authentication configured');
    console.error('');
    console.error('Please set ONE of the following:');
    console.error('');
    console.error('Option 1 - Anthropic API:');
    console.error('  ANTHROPIC_API_KEY=sk-ant-your-key-here');
    console.error('');
    console.error('Option 2 - AWS Bedrock:');
    console.error('  AWS_ACCESS_KEY_ID=your-access-key');
    console.error('  AWS_SECRET_ACCESS_KEY=your-secret-key');
    console.error('  AWS_REGION=us-east-1');
    console.error('');
    process.exit(1);
  }

  // Log authentication method
  if (hasAwsKeys) {
    if (!process.env.AWS_REGION) {
      console.error('❌ Error: AWS_REGION environment variable is required for AWS Bedrock');
      process.exit(1);
    }
    console.log('🔐 Using AWS Bedrock authentication');
  } else {
    console.log('🔐 Using Anthropic API authentication');
  }

  // Validate ANTHROPIC_MODEL environment variable
  if (!process.env.ANTHROPIC_MODEL) {
    console.error('❌ Error: ANTHROPIC_MODEL environment variable is required');
    console.error('');
    console.error('Add to your .env file:');
    console.error('  For Anthropic API: ANTHROPIC_MODEL=claude-sonnet-4-5-20250929');
    console.error('  For AWS Bedrock: ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0');
    console.error('');
    process.exit(1);
  }

  // Validate GITHUB_TOKEN environment variable
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    console.error('');
    console.error('Add to your .env file:');
    console.error('  GITHUB_TOKEN=ghp_your-token-here');
    console.error('');
    process.exit(1);
  }

  console.log(`\n🔍 Analyzing PR #${prNumber} from ${owner}/${repo}...\n`);


  try {
    // Create orchestrator instance
    const orchestrator = new CodeReviewOrchestrator();

    // Review the pull request
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    // Create reports directory if it doesn't exist
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate reports in all formats
    const generator = new ReportGenerator();
    const baseFilename = `${owner}-${repo}-pr${prNumber}`;

    // Generate JSON report
    const jsonReport = generator.generateJSONReport(report);
    const jsonPath = path.join(reportsDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonPath, jsonReport);
    console.log(`✅ JSON report saved to: ${jsonPath}`);

    // Generate Markdown report
    const mdReport = generator.generateMarkdownReport(report);
    const mdPath = path.join(reportsDir, `${baseFilename}.md`);
    fs.writeFileSync(mdPath, mdReport);
    console.log(`✅ Markdown report saved to: ${mdPath}`);

    // Generate HTML report
    const htmlReport = generator.generateHTMLReport(report);
    const htmlPath = path.join(reportsDir, `${baseFilename}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`✅ HTML report saved to: ${htmlPath}`);

    // Print summary
    console.log('\n📊 Review Summary:');
    console.log(`   Overall Score: ${report.summary.overallScore}/100`);
    console.log(`   Files Reviewed: ${report.summary.totalFiles}`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   High Priority Tests Needed: ${report.summary.highPriorityTests}`);
    console.log(`   Refactoring Opportunities: ${report.summary.refactoringOpportunities}`);
    console.log('');

  } catch (error) {
    logger.error('Review failed', { error });
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
