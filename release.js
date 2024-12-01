const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const releaseDir = path.join(__dirname, 'releases');
const versionFile = path.join(releaseDir, 'version.json');

const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));

// Directory Mapping for Release Types
const releaseFolders = {
    alpha: path.join(releaseDir, 'alpha'),
    beta: path.join(releaseDir, 'beta'),
    rc: path.join(releaseDir, 'rc'),
    stable: path.join(releaseDir, 'stable'),
};

// Create Directories If Not Exist
Object.values(releaseFolders).forEach((folder) => {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
});

// Update Changelog Template
const updateChangelog = (version, type) => {
    const changelogPath = path.join(releaseDir, 'changelogs', `${version}.md`);
    if (!fs.existsSync(changelogPath)) {
        const changelogTemplate = `# ${version} - ${type.toUpperCase()} Release\n\n## What's New\n- [ ] Add your changes here.\n`;
        fs.writeFileSync(changelogPath, changelogTemplate);
        console.log(`Changelog created: ${changelogPath}`);
    }
};

// Build the Application
const buildApp = (version, type) => {
    console.log(`Building ${type} release for version ${version}...`);
    execSync('npm run make', { stdio: 'inherit' });

    const distPath = path.join(__dirname, '../out/make/squirrel.windows/x64/');
    const exeName = `wisp-${version}.exe`;
    const exePath = path.join(distPath, exeName);

    if (fs.existsSync(exePath)) {
        const targetFolder = releaseFolders[type];
        const targetPath = path.join(targetFolder, exeName);
        fs.renameSync(exePath, targetPath);
        console.log(`Release moved to ${targetFolder}`);
    } else {
        console.error(`Executable not found: ${exePath}`);
    }
};

// Update Version and Push
const updateVersion = () => {
    versionData.version = versionData.nextVersion;
    const [major, minor, patch] = versionData.version.split('.');
    if (versionData.type === 'alpha') {
        versionData.nextVersion = `${major}.${minor}.${+patch + 1}-alpha.1`;
    } else if (versionData.type === 'beta') {
        versionData.nextVersion = `${major}.${+minor + 1}.0-beta.1`;
    } else if (versionData.type === 'rc') {
        versionData.nextVersion = `${major}.${+minor + 1}.0-rc.1`;
    } else if (versionData.type === 'stable') {
        versionData.nextVersion = `${+major + 1}.0.0`;
    }
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
    console.log(`Version updated to ${versionData.version}`);
};

// Main Function
const main = () => {
    const { version, type } = versionData;

    if (!releaseFolders[type]) {
        console.error(`Invalid release type: ${type}`);
        return;
    }

    updateChangelog(version, type);
    buildApp(version, type);
    updateVersion();

    console.log('Commit and push changes...');
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "Release ${version}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });

    console.log('Release process complete!');
};

main();
