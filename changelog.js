const fs = require('fs');
const prompt = require('prompt-sync')();

const changelogPath = './changelog.json';

// Load or initialize changelog
function loadChangelog() {
    if (!fs.existsSync(changelogPath)) {
        const initialData = { versions: [] };
        fs.writeFileSync(changelogPath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));
}

function addVersion(type, features = [], bugsFixed = [], improvements = []) {
    const changelog = loadChangelog();

    // Ensure `versions` array exists
    if (!changelog.versions) {
        changelog.versions = [];
    }

    // Fallback for empty `versions`
    const lastVersion = changelog.versions[changelog.versions.length - 1];
    const [major, minor, patch] = lastVersion ? lastVersion.version.split('-')[0].split('.').map(Number) : [0, 0, 1];

    // Find the highest prerelease number for the specified type
    const highestForType = changelog.versions
        .filter(entry => entry.type === type)
        .reduce((max, entry) => {
            const prerelease = entry.version.split('-')[1];
            const prereleaseNumber = prerelease ? +prerelease.split('.')[1] : 0;
            return Math.max(max, prereleaseNumber);
        }, 0);

    let newVersion;
    if (type === 'stable') {
        newVersion = `${major}.${minor}.${patch + 1}`; // Increment patch for stable
    } else {
        newVersion = `${major}.${minor}.${patch}-${type}.${highestForType + 1}`;
    }

    const newEntry = {
        version: newVersion,
        type,
        date: new Date().toISOString().split('T')[0], // Add current date in YYYY-MM-DD format
        features,
        bugsFixed,
        improvements
    };

    changelog.versions.push(newEntry);
    saveChangelog(changelog);
    console.log(`Added version ${newVersion}`);
}


// Save changelog to file
function saveChangelog(changelog) {
    fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));
}

// Modify an existing version
function modifyVersion() {
    const changelog = loadChangelog();
    if (changelog.versions.length === 0) {
        console.log("\nNo changelog entries to modify.");
        return;
    }

    console.log("\nSelect a version to modify:");
    changelog.versions.forEach((entry, index) => {
        console.log(`[${index + 1}] Version: ${entry.version} (${entry.type})`);
    });

    const versionChoice = parseInt(prompt("Enter the number of the version to modify: "), 10) - 1;

    if (versionChoice < 0 || versionChoice >= changelog.versions.length) {
        console.log("Invalid choice. Returning to main menu.");
        return;
    }

    const selectedVersion = changelog.versions[versionChoice];

    console.log(`\nModifying Version: ${selectedVersion.version} (${selectedVersion.type})`);
    console.log("1. Add Features");
    console.log("2. Add Bug Fixes");
    console.log("3. Add Improvements");
    console.log("4. Return to Main Menu");

    const modificationChoice = prompt("Select an option (1-4): ");
    let changes;
    switch (modificationChoice) {
        case "1":
            changes = getListInput("Enter new features (comma-separated): ");
            selectedVersion.features.push(...changes);
            console.log("Features added successfully.");
            break;
        case "2":
            changes = getListInput("Enter new bug fixes (comma-separated): ");
            selectedVersion.bugsFixed.push(...changes);
            console.log("Bug fixes added successfully.");
            break;
        case "3":
            changes = getListInput("Enter new improvements (comma-separated): ");
            selectedVersion.improvements.push(...changes);
            console.log("Improvements added successfully.");
            break;
        case "4":
            console.log("Returning to main menu.");
            return;
        default:
            console.log("Invalid choice. Returning to main menu.");
            return;
    }
    saveChangelog(changelog);
}

// Helper to get a list input
function getListInput(message) {
    const input = prompt(message);
    return input ? input.split(',').map(item => item.trim()) : [];
}

// View Changelog
function viewChangelog() {
    const changelog = loadChangelog();
    if (changelog.versions.length === 0) {
        console.log("\nNo changelog entries found.");
        return;
    }

    console.log("\nChangelog:");
    changelog.versions.forEach((entry, index) => {
        console.log(`\n[${index + 1}] Version: ${entry.version} (${entry.type})`);
        console.log(`  Features: ${entry.features.join(", ") || "None"}`);
        console.log(`  Bugs Fixed: ${entry.bugsFixed.join(", ") || "None"}`);
        console.log(`  Improvements: ${entry.improvements.join(", ") || "None"}`);
    });
}

// Main Menu
function mainMenu() {
    while (true) {
        console.log("\nChangelog Editor");
        console.log("1. Add New Version");
        console.log("2. Modify Existing Version");
        console.log("3. View Changelog");
        console.log("4. Exit");

        const choice = prompt("Select an option (1-4): ");
        switch (choice) {
            case "1":
                handleAddVersion();
                break;
            case "2":
                modifyVersion();
                break;
            case "3":
                viewChangelog();
                break;
            case "4":
                console.log("Goodbye!");
                return;
            default:
                console.log("Invalid choice. Please try again.");
        }
    }
}

// Add New Version UI
function handleAddVersion() {
    console.log("\nSelect version type:");
    console.log("1. Alpha");
    console.log("2. Beta");
    console.log("3. RC");
    console.log("4. Stable");

    const versionTypeChoice = prompt("Select a version type (1-4): ");
    const versionType = ["alpha", "beta", "rc", "stable"][+versionTypeChoice - 1];

    if (!versionType) {
        console.log("Invalid version type. Returning to main menu.");
        return;
    }

    const features = getListInput("Enter features (comma-separated): ");
    const bugsFixed = getListInput("Enter bugs fixed (comma-separated): ");
    const improvements = getListInput("Enter improvements (comma-separated): ");

    addVersion(versionType, features, bugsFixed, improvements);
}

// Run the app
mainMenu();
