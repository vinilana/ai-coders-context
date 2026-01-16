/**
 * REFERENCE ONLY - This file is not used by generators anymore.
 *
 * Scaffold structures are now defined in:
 * src/generators/shared/scaffoldStructures.ts
 *
 * This file serves as historical reference for the structure/content
 * that should be generated for this document type.
 *
 * @deprecated Since v2.0.0 scaffold system
 */
import { wrapWithFrontMatter } from './common';

export function renderTroubleshooting(): string {
  const content = `# Troubleshooting Guide

**Purpose:** Enable AI agents to diagnose and resolve issues using automated diagnostics and decision trees.

**Agent Protocol:**
1. Run diagnostic script to gather facts
2. Match symptoms to known patterns
3. Execute resolution if confidence high (>80%)
4. Escalate to human if uncertain or high-risk
5. Log all diagnostic steps and resolution attempts

## Agent Diagnostic Script

**Agent First Action:** Always run this diagnostic script to gather system state.

\`\`\`bash
#!/bin/bash
# Save as: scripts/diagnose.sh
# Agent runs this for ANY issue before attempting fixes

echo "=== System Diagnostics $(date) ==="

# 1. Application Status
echo -e "\\n[Application Status]"
curl -sf http://localhost:3000/health && echo "✓ App responding" || echo "✗ App not responding"

# 2. Recent Errors
echo -e "\\n[Recent Errors - Last 50 lines]"
tail -50 logs/error.log 2>/dev/null || echo "No error log found"

# 3. System Resources
echo -e "\\n[System Resources]"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $5 " used"}')"

# 4. Critical Services
echo -e "\\n[Critical Services]"
nc -z localhost 5432 && echo "✓ Database reachable" || echo "✗ Database unreachable"
nc -z localhost 6379 && echo "✓ Redis reachable" || echo "✗ Redis unreachable"

# 5. Recent Git Changes
echo -e "\\n[Recent Changes]"
git log --oneline -5

# 6. Running Processes
echo -e "\\n[Node Processes]"
ps aux | grep -i node | grep -v grep

echo -e "\\n=== Diagnostics Complete ==="
\`\`\`

**Agent Usage:**
\`\`\`bash
chmod +x scripts/diagnose.sh
./scripts/diagnose.sh > diagnostics-$(date +%Y%m%d-%H%M%S).txt
# Agent parses output to determine issue category
\`\`\`

## Agent Decision Tree

**Agent follows this tree based on diagnostic output:**

\`\`\`
App not responding?
├─ YES → Check "Application Won't Start" section
└─ NO → Continue

Database unreachable?
├─ YES → Check "Database Issues" section
└─ NO → Continue

Error log has entries?
├─ YES → Parse errors, match to "Common Issues" patterns
└─ NO → Check "Performance Issues" section

CPU > 80% OR Memory > 90%?
├─ YES → Check "Performance/Memory Issues" section
└─ NO → Escalate (unusual state, no clear pattern)
\`\`\`

**Agent Pattern Matching:**
\`\`\`bash
# Agent extracts last error from log
LAST_ERROR=$(tail -1 logs/error.log)

# Agent matches against known patterns
if echo "$LAST_ERROR" | grep -q "ECONNREFUSED"; then
  # Database connection issue
  ISSUE_TYPE="database_connection"
  CONFIDENCE="high"
elif echo "$LAST_ERROR" | grep -q "EADDRINUSE"; then
  # Port conflict
  ISSUE_TYPE="port_in_use"
  CONFIDENCE="high"
elif echo "$LAST_ERROR" | grep -q "Cannot find module"; then
  # Missing dependency
  ISSUE_TYPE="missing_dependency"
  CONFIDENCE="high"
else
  # Unknown pattern
  ISSUE_TYPE="unknown"
  CONFIDENCE="low"
fi

# Agent decides action based on confidence
if [ "$CONFIDENCE" == "high" ]; then
  echo "Agent attempting auto-resolution for $ISSUE_TYPE"
  # Execute fix from "Common Issues" section
else
  echo "Agent escalating: unknown error pattern"
  # Create issue with diagnostic output
fi
\`\`\`

## Common Issues & Solutions

### Application Won't Start

**Agent Auto-Resolution: YES (safe to attempt)**

#### Error Pattern: "EADDRINUSE"
**Agent Detection:** Log contains "EADDRINUSE" or "port already in use"

**Agent Resolution:**
\`\`\`bash
# Agent automatically kills process and restarts
PORT=\${PORT:-3000}
PID=$(lsof -ti:\$PORT)
if [ -n "\$PID" ]; then
  echo "Killing process \$PID on port \$PORT"
  kill -9 \$PID
  sleep 2
fi
npm start
# Agent verifies: curl -f http://localhost:\$PORT/health
\`\`\`

#### Error Pattern: "Cannot find module"
**Agent Detection:** Log contains "Cannot find module" or "MODULE_NOT_FOUND"

**Agent Resolution:**
\`\`\`bash
# Agent reinstalls dependencies
rm -rf node_modules package-lock.json
npm install
npm start
# Agent logs: "Resolved missing module issue by reinstalling dependencies"
\`\`\`

#### Error Pattern: "Missing environment variable"
**Agent Detection:** Log contains "undefined" for env var or "Missing required environment variable"

**Agent Resolution:**
\`\`\`bash
# Agent checks .env.example for required vars
REQUIRED_VARS=$(grep -v "^#" .env.example | cut -d= -f1)
for VAR in \$REQUIRED_VARS; do
  if [ -z "\${!VAR}" ]; then
    echo "ERROR: Missing required environment variable: \$VAR"
    echo "Agent cannot auto-resolve. Escalating to human."
    exit 1
  fi
done
\`\`\`
**Agent Action:** ESCALATE (requires human to set values)

---

### Performance Issues

**Agent Auto-Resolution: CONDITIONAL (depends on cause)**

#### Error Pattern: High CPU Usage
**Agent Detection:** CPU >80% sustained for >5 minutes

**Agent Diagnostic:**
\`\`\`bash
# Agent identifies high CPU process
top -bn1 | head -20
ps aux --sort=-%cpu | head -10

# Agent checks if it's the application
APP_PID=$(ps aux | grep "node.*index.js" | grep -v grep | awk '{print \$2}')
APP_CPU=$(ps aux | grep \$APP_PID | awk '{print \$3}')

if (( \$(echo "\$APP_CPU > 80" | bc -l) )); then
  echo "Application consuming high CPU: \${APP_CPU}%"
  echo "Agent Action: Restart application"
  pm2 restart app || npm run restart
else
  echo "External process consuming CPU - Agent escalating to human"
fi
\`\`\`

---

### Database Issues

**Agent Auto-Resolution: CONDITIONAL**

#### Error Pattern: "ECONNREFUSED" (Database)
**Agent Detection:** Log contains "ECONNREFUSED" with database port (5432, 3306, 27017)

**Agent Diagnostic:**
\`\`\`bash
# Check if database is running
nc -z localhost 5432 && echo "DB reachable" || echo "DB not reachable"

# If not reachable, attempt to start
if ! nc -z localhost 5432; then
  echo "Agent attempting to start database..."
  docker-compose up -d db || sudo systemctl start postgresql
  sleep 5
  nc -z localhost 5432 && echo "✓ Database started" || echo "✗ Failed to start - escalating"
fi
\`\`\`

---

## Escalation Criteria

**Agent must escalate immediately when:**
- Unknown error pattern (confidence <50%)
- Data corruption risk (database migration failures, validation errors)
- Security issue detected (exposed credentials, unauthorized access)
- Multiple resolution attempts failed (tried 2+ fixes, issue persists)
- Human approval required (destructive operations, production changes)

**Escalation format:**
\`\`\`bash
# Agent creates structured escalation
cat > escalation-\$(date +%Y%m%d-%H%M%S).txt <<EOF
ESCALATION REQUIRED

Issue: [Brief description]
Confidence: [low/medium]
Risk Level: [low/medium/high]

Symptoms:
- [List observed symptoms]

Diagnostics Run:
- [Commands executed]
- [Output summary]

Resolution Attempts:
- [What agent tried]
- [Results]

Recommendation:
- [Suggested next steps for human]

Diagnostic Files:
- diagnostics-*.txt
- logs/error.log (last 100 lines attached below)

---
\$(tail -100 logs/error.log)
EOF

echo "Escalation created. Agent awaiting human intervention."
\`\`\`
`;

  return wrapWithFrontMatter(content);
}