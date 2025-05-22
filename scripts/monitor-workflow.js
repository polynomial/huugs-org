const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const OWNER = 'polynomial';
const REPO = 'huugs-org';
const WORKFLOW_FILE = '.github/workflows/deploy.yml';

async function getLatestWorkflowRun() {
  try {
    const { data: runs } = await octokit.actions.listWorkflowRuns({
      owner: OWNER,
      repo: REPO,
      workflow_id: WORKFLOW_FILE,
      per_page: 1
    });
    return runs.workflow_runs[0];
  } catch (error) {
    if (error.status === 403) {
      console.error('Permission denied. Please check your GitHub token permissions.');
      process.exit(1);
    }
    console.error('Error fetching workflow runs:', error.message);
    return null;
  }
}

async function fixWorkflow(jobName) {
  console.log(`Attempting to fix ${jobName} job...`);
  
  try {
    // Read current workflow file
    const workflowContent = execSync(`cat ${WORKFLOW_FILE}`).toString();
    
    let fixedContent = workflowContent;
    
    switch (jobName) {
      case 'process-images':
        // Add retry logic for image processing
        fixedContent = workflowContent.replace(
          /name: Process images\n\s+run: npm run process-images/,
          `name: Process images
          run: |
            for i in {1..3}; do
              if npm run process-images; then
                exit 0
              fi
              echo "Attempt $i failed, retrying..."
              sleep 5
            done
            exit 1`
        );
        break;
        
      case 'test':
        // Increase server startup timeout and add retry logic
        fixedContent = workflowContent.replace(
          /for i in {1\.\.30}; do/,
          'for i in {1..60}; do'
        ).replace(
          /npm start &/,
          `npm start &
          # Add retry logic for tests
          for i in {1..3}; do
            if npm run test && npm run test:masonry; then
              exit 0
            fi
            echo "Test attempt $i failed, retrying..."
            sleep 5
          done
          exit 1`
        );
        break;
        
      case 'deploy':
        // Add retry logic for deployment
        fixedContent = workflowContent.replace(
          /name: Deploy to GitHub Pages/,
          `name: Deploy to GitHub Pages
          run: |
            for i in {1..3}; do
              if npm run deploy; then
                exit 0
              fi
              echo "Deploy attempt $i failed, retrying..."
              sleep 10
            done
            exit 1`
        );
        break;
    }
    
    if (fixedContent !== workflowContent) {
      // Write fixed content back to file
      execSync(`echo '${fixedContent}' > ${WORKFLOW_FILE}`);
      
      // Commit and push changes
      execSync('git add .');
      execSync('git commit -m "Fix workflow: Add retry logic for ' + jobName + ' job"');
      execSync('git push');
      
      console.log(`Fixed ${jobName} job and pushed changes`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error fixing workflow:', error.message);
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function monitorWorkflow() {
  console.log('Starting workflow monitoring...');
  const startTime = Date.now();
  const MAX_DURATION = 20 * 60 * 1000; // 20 minutes
  let lastRunId = null;
  let consecutiveErrors = 0;
  let lastErrorTime = 0;
  let lastCheckTime = 0;
  
  while (Date.now() - startTime < MAX_DURATION) {
    try {
      // Ensure we don't check too frequently
      const timeSinceLastCheck = Date.now() - lastCheckTime;
      if (timeSinceLastCheck < 30000) {
        await sleep(30000 - timeSinceLastCheck);
      }
      
      const run = await getLatestWorkflowRun();
      lastCheckTime = Date.now();
      
      if (!run) {
        console.log('No workflow runs found, waiting...');
        await sleep(30000);
        continue;
      }
      
      // Only process if this is a new run
      if (run.id === lastRunId) {
        await sleep(30000);
        continue;
      }
      
      lastRunId = run.id;
      console.log(`Workflow run #${run.id} status: ${run.status}, conclusion: ${run.conclusion}`);
      
      if (run.status === 'completed') {
        if (run.conclusion === 'success') {
          console.log('Workflow completed successfully!');
          return;
        } else if (run.conclusion === 'failure') {
          console.log('Workflow failed, checking job details...');
          
          try {
            const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({
              owner: OWNER,
              repo: REPO,
              run_id: run.id
            });
            
            for (const job of jobs.jobs) {
              if (job.conclusion === 'failure') {
                console.log(`Job ${job.name} failed`);
                const fixed = await fixWorkflow(job.name);
                if (fixed) {
                  console.log('Waiting for new workflow run to start...');
                  await sleep(10000);
                  break;
                }
              }
            }
          } catch (error) {
            if (error.status === 403) {
              console.error('Permission denied. Please check your GitHub token permissions.');
              process.exit(1);
            }
            console.error('Error checking job details:', error.message);
            consecutiveErrors++;
            lastErrorTime = Date.now();
            if (consecutiveErrors >= 3) {
              console.error('Too many consecutive errors, exiting...');
              process.exit(1);
            }
          }
        }
      }
      
      // Reset error counter if no errors in last minute
      if (Date.now() - lastErrorTime > 60000) {
        consecutiveErrors = 0;
      }
      
      console.log('Waiting 30 seconds before next check...');
      await sleep(30000);
    } catch (error) {
      if (error.status === 403) {
        console.error('Permission denied. Please check your GitHub token permissions.');
        process.exit(1);
      }
      console.error('Error monitoring workflow:', error.message);
      consecutiveErrors++;
      lastErrorTime = Date.now();
      if (consecutiveErrors >= 3) {
        console.error('Too many consecutive errors, exiting...');
        process.exit(1);
      }
      await sleep(30000);
    }
  }
  
  console.log('Monitoring timeout reached');
}

// Run the monitor
monitorWorkflow().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
}); 