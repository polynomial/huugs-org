const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const REPO_OWNER = 'polynomial';
const REPO_NAME = 'huugs-org';
const WORKFLOW_FILE = 'deploy.yml';

async function getLatestWorkflowRun() {
  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      workflow_id: WORKFLOW_FILE,
      per_page: 1
    });

    return runs.workflow_runs[0];
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    return null;
  }
}

async function checkWorkflowStatus() {
  const run = await getLatestWorkflowRun();
  if (!run) {
    console.log('No workflow runs found');
    return;
  }

  console.log(`Workflow run #${run.id} status: ${run.status}, conclusion: ${run.conclusion}`);

  if (run.status === 'completed') {
    if (run.conclusion === 'success') {
      console.log('Workflow completed successfully!');
      return true;
    } else {
      console.log('Workflow failed. Checking job details...');
      
      // Get failed jobs
      const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        run_id: run.id
      });

      for (const job of jobs.jobs) {
        if (job.conclusion === 'failure') {
          console.log(`Job ${job.name} failed.`);
          
          // Handle specific failure cases based on job name
          if (job.name === 'process-images') {
            console.log('Fixing process-images job...');
            // Fix artifact handling
            execSync('git checkout .github/workflows/deploy.yml');
            // Add your fix here
          } else if (job.name === 'test') {
            console.log('Fixing test job...');
            // Fix test issues
            execSync('git checkout .github/workflows/deploy.yml');
            // Add your fix here
          } else if (job.name === 'deploy') {
            console.log('Fixing deploy job...');
            // Fix deployment issues
            execSync('git checkout .github/workflows/deploy.yml');
            // Add your fix here
          }
        }
      }
    }
  }

  return false;
}

async function monitorWorkflow() {
  const startTime = Date.now();
  const timeout = 20 * 60 * 1000; // 20 minutes

  while (Date.now() - startTime < timeout) {
    const success = await checkWorkflowStatus();
    if (success) {
      console.log('Workflow completed successfully within timeout period');
      return;
    }

    console.log('Waiting 30 seconds before next check...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  console.log('Timeout reached. Workflow did not complete successfully within 20 minutes.');
}

// Run the monitor
monitorWorkflow().catch(console.error); 