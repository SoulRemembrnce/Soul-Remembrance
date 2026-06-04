#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

// Find Java 17 installation
function findJava17() {
  // Try common Ubuntu paths
  const candidates = [
    '/usr/lib/jvm/java-17-openjdk-amd64',
    '/usr/lib/jvm/java-17-openjdk',
    '/usr/lib/jvm/java-17-amazon-corretto',
    '/usr/lib/jvm/temurin-17',
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'bin', 'java'))) {
      return p;
    }
  }

  // Try find command
  const found = run("find /usr/lib/jvm -maxdepth 2 -name 'java' -path '*/17*/bin/java' 2>/dev/null | head -1");
  if (found) {
    return path.dirname(path.dirname(found));
  }

  // Try update-alternatives
  const alt = run("update-java-alternatives -l 2>/dev/null | grep '17' | awk '{print $3}' | head -1");
  if (alt && fs.existsSync(path.join(alt, 'bin', 'java'))) {
    return alt;
  }

  return null;
}

let java17 = findJava17();

if (!java17) {
  console.log('Java 17 not found — installing via apt-get...');
  spawnSync('sudo', ['apt-get', 'install', '-y', 'openjdk-17-jdk'], { stdio: 'inherit' });
  java17 = findJava17();
}

if (!java17) {
  console.error('ERROR: Could not locate or install Java 17. Build may fail.');
  process.exit(0); // Don't fail the hook — let Gradle give the real error
}

console.log(`Found Java 17 at: ${java17}`);

// Write to ~/.gradle/gradle.properties — this is read by ALL Gradle builds
// and is NOT overwritten by expo prebuild
const gradleDir = path.join(os.homedir(), '.gradle');
const gradleProps = path.join(gradleDir, 'gradle.properties');

fs.mkdirSync(gradleDir, { recursive: true });

let contents = '';
if (fs.existsSync(gradleProps)) {
  contents = fs.readFileSync(gradleProps, 'utf8');
  // Remove any existing java.home line
  contents = contents.split('\n').filter(l => !l.startsWith('org.gradle.java.home')).join('\n');
}

contents += `\norg.gradle.java.home=${java17}\n`;
fs.writeFileSync(gradleProps, contents);
console.log(`Wrote org.gradle.java.home=${java17} to ${gradleProps}`);
