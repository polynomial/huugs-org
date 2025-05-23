const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Deployment Setup...\n');

// Check required files
const requiredFiles = [
    '.github/workflows/deploy.yml',
    'public/CNAME',
    'package.json',
    'scripts/process-images.js',
    'pics'
];

let allGood = true;

console.log('📋 Checking required files:');
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${file}`);
    if (!exists) allGood = false;
});

// Check pics directory structure
console.log('\n📁 Checking pics/ directory:');
if (fs.existsSync('pics')) {
    try {
        const picsContent = fs.readdirSync('pics', { withFileTypes: true });
        const directories = picsContent.filter(item => item.isDirectory());
        
        if (directories.length > 0) {
            console.log(`   ✅ Found ${directories.length} photo directories:`);
            directories.forEach(dir => {
                const dirPath = path.join('pics', dir.name);
                const files = fs.readdirSync(dirPath);
                const imageFiles = files.filter(file => 
                    /\.(jpg|jpeg|png|webp|tiff|gif)$/i.test(file)
                );
                console.log(`      • ${dir.name}: ${imageFiles.length} images`);
            });
        } else {
            console.log('   ⚠️  No photo directories found in pics/');
        }
    } catch (error) {
        console.log('   ❌ Error reading pics/ directory:', error.message);
        allGood = false;
    }
} else {
    console.log('   ❌ pics/ directory does not exist');
    allGood = false;
}

// Check package.json scripts
console.log('\n📦 Checking package.json scripts:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = ['process-images', 'build', 'test'];
    
    requiredScripts.forEach(script => {
        const exists = packageJson.scripts && packageJson.scripts[script];
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} npm run ${script}`);
        if (!exists) allGood = false;
    });
} catch (error) {
    console.log('   ❌ Error reading package.json:', error.message);
    allGood = false;
}

// Check CNAME content
console.log('\n🌐 Checking CNAME configuration:');
try {
    const cname = fs.readFileSync('public/CNAME', 'utf8').trim();
    if (cname === 'huugs.org') {
        console.log('   ✅ CNAME configured for huugs.org');
    } else {
        console.log(`   ⚠️  CNAME contains: ${cname}`);
    }
} catch (error) {
    console.log('   ❌ Error reading CNAME:', error.message);
    allGood = false;
}

// Check GitHub workflow
console.log('\n🚀 Checking GitHub Actions workflow:');
try {
    const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
    
    const checks = [
        { check: '- \'pics/**\'', description: 'Triggers on pics/ changes' },
        { check: 'npm run process-images', description: 'Processes images' },
        { check: 'actions/deploy-pages@v4', description: 'Deploys to GitHub Pages' },
        { check: 'path: ./public', description: 'Deploys public/ directory' }
    ];
    
    checks.forEach(({ check, description }) => {
        const exists = workflow.includes(check);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${description}`);
        if (!exists) allGood = false;
    });
} catch (error) {
    console.log('   ❌ Error reading workflow file:', error.message);
    allGood = false;
}

// Final summary
console.log('\n' + '='.repeat(50));
if (allGood) {
    console.log('🎉 Deployment setup is ready!');
    console.log('\n📝 Next steps:');
    console.log('   1. Commit your changes: git add . && git commit -m "Setup automated deployment"');
    console.log('   2. Push to GitHub: git push origin main');
    console.log('   3. Enable GitHub Pages in repository Settings → Pages');
    console.log('   4. Configure DNS for huugs.org (see DEPLOYMENT.md)');
    console.log('\n🌟 After setup, just add photos to pics/ and push to deploy!');
} else {
    console.log('❌ Some issues found. Please fix them before deploying.');
    console.log('\n📖 See DEPLOYMENT.md for detailed setup instructions.');
}

console.log(''); 