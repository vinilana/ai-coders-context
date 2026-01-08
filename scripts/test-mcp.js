#!/usr/bin/env node
/**
 * Simple MCP test client for local development
 *
 * Usage: node scripts/test-mcp.js
 */

const { spawn } = require('child_process');
const readline = require('readline');

const server = spawn('node', ['dist/index.js', 'mcp', '-v'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = readline.createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

let messageId = 1;

function send(method, params = {}) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params
  };
  console.log('\n→ Sending:', JSON.stringify(message, null, 2));
  server.stdin.write(JSON.stringify(message) + '\n');
}

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('\n← Received:', JSON.stringify(response, null, 2));
  } catch {
    console.log('← Raw:', line);
  }
});

// Test sequence
async function runTests() {
  console.log('=== MCP Server Test ===\n');

  // 1. Initialize
  send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });

  await sleep(500);

  // 2. Send initialized notification
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  }) + '\n');

  await sleep(500);

  // 3. List tools
  send('tools/list', {});

  await sleep(500);

  // 4. Call a tool
  send('tools/call', {
    name: 'listFiles',
    arguments: {
      pattern: '*.ts',
      cwd: process.cwd() + '/src'
    }
  });

  await sleep(1000);

  // 5. List resources
  send('resources/list', {});

  await sleep(500);

  console.log('\n=== Tests complete ===');
  console.log('Press Ctrl+C to exit\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});

runTests().catch(console.error);
