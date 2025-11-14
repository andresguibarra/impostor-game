#!/usr/bin/env node

// Script to bump version and update version.json
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, '..', 'package.json');
const versionJsonPath = join(__dirname, '..', 'public', 'version.json');

// Read current package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

// Parse version
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Bump patch version
const newVersion = `${major}.${minor}.${patch + 1}`;

// Update package.json
packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update version.json
const versionJson = {
  version: newVersion,
  buildDate: new Date().toISOString()
};
writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n');

console.log(`Version bumped from ${currentVersion} to ${newVersion}`);
