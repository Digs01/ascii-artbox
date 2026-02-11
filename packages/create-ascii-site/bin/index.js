#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const prompts = require('prompts');
const { green, cyan, red } = require('kleur');

async function init() {
    console.log(cyan('\n  AsciiWeb Project Scaffolding  \n'));

    // 1. Get Project Name
    const response = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'What is your project name?',
        initial: 'my-ascii-app',
        validate: value => {
            if (!value.trim()) return 'Project name is required';
            if (fs.existsSync(value)) return 'Directory already exists';
            return true;
        }
    });

    if (!response.projectName) {
        console.log(red('Cancelled.'));
        process.exit(1);
    }

    const projectDir = path.join(process.cwd(), response.projectName);
    const templateDir = path.join(__dirname, '../template');

    // 2. Copy Template
    console.log(`\nCreating project in ${green(projectDir)}...`);

    try {
        await fs.copy(templateDir, projectDir);

        // 3. Update package.json name
        const pkgPath = path.join(projectDir, 'package.json');
        const pkg = await fs.readJson(pkgPath);
        pkg.name = response.projectName;
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });

        // 4. Create .gitignore (npm usually excludes it from template)
        const gitignore = `node_modules
.next
.ds_store
.env.local
dist
`;
        await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);

        console.log(green('\nSuccess! Project created.'));
        console.log('\nNext steps:');
        console.log(`  cd ${response.projectName}`);
        console.log('  npm install');
        console.log('  npm run dev');

    } catch (err) {
        console.error(red('Error creating project:'), err);
        process.exit(1);
    }
}

init().catch(console.error);
