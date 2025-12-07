import { MARKER_IDS, wrapDocument } from '../../shared';

/**
 * Troubleshooting Guide Template
 *
 * REFACTORED: Now uses centralized marker registry and template sections.
 * This template is larger but still benefits from standardized structure.
 */
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
curl -sf http://localhost:3000/health && echo "OK: App responding" || echo "ERROR: App not responding"

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
nc -z localhost 5432 && echo "OK: Database reachable" || echo "ERROR: Database unreachable"
nc -z localhost 6379 && echo "OK: Redis reachable" || echo "ERROR: Redis unreachable"

echo -e "\\n=== Diagnostics Complete ==="
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

## Common Issues & Solutions

### Application Won't Start

**Agent Auto-Resolution: YES (safe to attempt)**

#### Error Pattern: "EADDRINUSE"
**Detection:** Log contains "EADDRINUSE" or "port already in use"

**Resolution:**
\`\`\`bash
PORT=\${PORT:-3000}
PID=$(lsof -ti:\$PORT)
if [ -n "\$PID" ]; then
  echo "Killing process \$PID on port \$PORT"
  kill -9 \$PID
  sleep 2
fi
npm start
\`\`\`

#### Error Pattern: "Cannot find module"
**Detection:** Log contains "Cannot find module" or "MODULE_NOT_FOUND"

**Resolution:**
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
npm start
\`\`\`

### Database Issues

**Agent Auto-Resolution: CONDITIONAL**

#### Error Pattern: "ECONNREFUSED" (Database)
**Detection:** Log contains "ECONNREFUSED" with database port

**Diagnostic:**
\`\`\`bash
nc -z localhost 5432 && echo "DB reachable" || echo "DB not reachable"

if ! nc -z localhost 5432; then
  echo "Attempting to start database..."
  docker-compose up -d db || sudo systemctl start postgresql
  sleep 5
  nc -z localhost 5432 && echo "Database started" || echo "Failed - escalating"
fi
\`\`\`

## Escalation Criteria

**Agent must escalate immediately when:**
- Unknown error pattern (confidence <50%)
- Data corruption risk (database migration failures)
- Security issue detected (exposed credentials)
- Multiple resolution attempts failed (tried 2+ fixes)
- Human approval required (destructive operations)

**Escalation format:**
\`\`\`
ESCALATION REQUIRED

Issue: [Brief description]
Confidence: [low/medium]
Risk Level: [low/medium/high]

Symptoms:
- [List observed symptoms]

Resolution Attempts:
- [What agent tried]
- [Results]

Recommendation:
- [Suggested next steps for human]
\`\`\``;

  return wrapDocument({
    markerId: MARKER_IDS.docs.troubleshooting,
    content,
    guidance: 'troubleshooting',
    sources: 'troubleshooting',
  });
}
