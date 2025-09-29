import { createFrontMatter } from './frontMatter';

export function renderTroubleshooting(): string {
  const frontMatter = createFrontMatter({
    id: 'troubleshooting-guide',
    goal: 'Enable AI agents to diagnose and resolve issues autonomously using decision trees and automated diagnostics.',
    requiredInputs: [
      'Log file locations and parsing patterns',
      'Diagnostic scripts (scripts/debug/, scripts/health-check/)',
      'Known error patterns and their resolutions'
    ],
    successCriteria: [
      'Agent can execute diagnostic scripts and interpret output',
      'Agent can identify root cause from error patterns',
      'Agent knows when to escalate vs. auto-resolve'
    ],
    relatedAgents: ['bug-fixer', 'devops-specialist', 'backend-specialist']
  });

  return `${frontMatter}
<!-- agent-update:start:troubleshooting-guide -->
# Troubleshooting Guide

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
PORT=${PORT:-3000}
PID=$(lsof -ti:$PORT)
if [ -n "$PID" ]; then
  echo "Killing process $PID on port $PORT"
  kill -9 $PID
  sleep 2
fi
npm start
# Agent verifies: curl -f http://localhost:$PORT/health
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
for VAR in $REQUIRED_VARS; do
  if [ -z "${!VAR}" ]; then
    echo "ERROR: Missing required environment variable: $VAR"
    echo "Agent cannot auto-resolve. Escalating to human."
    exit 1
  fi
done
\`\`\`
**Agent Action:** ESCALATE (requires human to set values)

2. **Missing environment variables**
   \`\`\`bash
   # Verify environment variables
   printenv | grep APP_

   # Check .env file exists and is properly formatted
   cat .env

   # Copy from example if missing
   cp .env.example .env
   \`\`\`

3. **Dependency installation failed**
   \`\`\`bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install

   # Or with yarn
   rm -rf node_modules yarn.lock
   yarn install
   \`\`\`

4. **Database connection issues**
   - Verify database is running: \`docker ps\` or check service status
   - Check connection string in environment variables
   - Verify database credentials and permissions
   - Test network connectivity to database host

---

### Performance Issues

#### Symptom
Application responds slowly or times out.

#### Diagnostic Steps
1. **Check server resources**
   \`\`\`bash
   # CPU and memory usage
   top

   # Disk I/O
   iostat -x 1

   # Network throughput
   iftop
   \`\`\`

2. **Analyze application logs**
   - Look for slow query warnings
   - Check for excessive error logs
   - Identify long-running requests

3. **Profile the application**
   \`\`\`bash
   # Node.js profiling
   node --prof app.js
   node --prof-process isolate-*.log

   # Or use built-in profiling tools
   npm run profile  # if configured
   \`\`\`

#### Common Solutions
- **Database queries:** Add indexes, optimize N+1 queries, implement query caching
- **Memory leaks:** Use heap snapshots to identify retained objects
- **External API calls:** Implement timeouts, circuit breakers, and caching
- **Large payloads:** Add pagination, compression, or streaming

---

### Authentication Failures

#### Symptom
Users cannot log in or authentication tokens are rejected.

#### Common Causes
1. **Expired tokens**
   - Check token expiration time
   - Implement token refresh flow
   - Verify system clock synchronization

2. **Invalid credentials**
   - Verify password hashing algorithm matches
   - Check for case sensitivity issues
   - Confirm user exists in database

3. **CORS issues**
   \`\`\`bash
   # Check browser console for CORS errors
   # Verify allowed origins in CORS configuration
   \`\`\`

4. **JWT verification failures**
   - Verify JWT secret matches across services
   - Check token signature algorithm
   - Validate token structure (header.payload.signature)

---

### Database Issues

#### Connection Failures
\`\`\`bash
# Test database connectivity
telnet <db-host> <db-port>

# Check database service status
sudo systemctl status postgresql  # or mysql, mongodb, etc.

# Verify connection string format
# PostgreSQL: postgresql://user:pass@host:5432/dbname
# MySQL: mysql://user:pass@host:3306/dbname
# MongoDB: mongodb://user:pass@host:27017/dbname
\`\`\`

#### Migration Failures
\`\`\`bash
# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Re-run migrations
npm run migrate:up

# Reset database (DANGER: destroys data)
npm run db:reset
\`\`\`

#### Query Performance
- Enable query logging to identify slow queries
- Use EXPLAIN ANALYZE to understand query execution
- Add appropriate indexes
- Consider query result caching

---

### Build & Deployment Issues

#### Build Failures
\`\`\`bash
# Clear build cache
rm -rf dist/ build/ .next/  # depending on framework

# Reinstall dependencies with exact versions
npm ci

# Check for TypeScript errors
npm run type-check

# Run build with verbose logging
npm run build -- --verbose
\`\`\`

#### Deployment Failures
- Verify environment variables are set correctly
- Check deployment logs for specific errors
- Ensure database migrations ran successfully
- Verify health checks pass after deployment
- Check for version conflicts in dependencies

---

### API & Integration Issues

#### External API Failures
1. **Check API status**
   - Visit service status page
   - Test endpoints directly with curl
   - Verify API keys and credentials

2. **Network connectivity**
   \`\`\`bash
   # Test DNS resolution
   nslookup api.external-service.com

   # Test connectivity
   curl -v https://api.external-service.com

   # Check firewall rules
   # Add project-specific network checks
   \`\`\`

3. **Rate limiting**
   - Check for 429 status codes
   - Review rate limit headers
   - Implement exponential backoff

#### Webhook Failures
- Verify webhook URL is accessible from external networks
- Check webhook signature validation
- Review webhook delivery logs
- Test with webhook testing tools (webhook.site, ngrok)

---

### Memory Issues

#### Memory Leaks
\`\`\`bash
# Node.js heap snapshot
node --inspect app.js
# Then use Chrome DevTools to capture heap snapshots

# Monitor memory usage over time
watch -n 5 'ps aux | grep node'
\`\`\`

#### Out of Memory Errors
- Increase Node.js heap size: \`node --max-old-space-size=4096 app.js\`
- Review memory-intensive operations (large file processing, caching)
- Implement streaming for large data sets
- Use pagination instead of loading all records

---

## Log Interpretation

### Log Locations
- **Application logs:** \`logs/app.log\` or \`/var/log/app/\`
- **Web server logs:** \`/var/log/nginx/\` or \`/var/log/apache2/\`
- **System logs:** \`/var/log/syslog\` or \`journalctl\`
- **Container logs:** \`docker logs <container-id>\`

### Log Levels
- **ERROR:** Immediate attention required
- **WARN:** Potential issues that should be investigated
- **INFO:** Normal operational events
- **DEBUG:** Detailed information for debugging (disable in production)

### Useful Log Queries
\`\`\`bash
# Find errors in last hour
grep ERROR logs/app.log | tail -100

# Count error types
grep ERROR logs/app.log | cut -d':' -f2 | sort | uniq -c | sort -rn

# Follow logs in real-time
tail -f logs/app.log

# Search for specific request ID
grep "req_abc123" logs/*.log

# Filter by timestamp
awk '/2024-01-15 10:00/,/2024-01-15 11:00/' logs/app.log
\`\`\`

---

## Debugging Tools

### Local Development
- **Node.js Debugger:** \`node --inspect\` + Chrome DevTools
- **VS Code Debugger:** Configure launch.json for breakpoints
- **React DevTools:** Browser extension for React debugging
- **Redux DevTools:** State inspection for Redux apps

### Production Debugging
- **APM Tools:** DataDog, New Relic, Dynatrace
- **Log Aggregation:** ELK Stack, Splunk, CloudWatch
- **Distributed Tracing:** Jaeger, Zipkin, X-Ray
- **Error Tracking:** Sentry, Rollbar, Bugsnag

---

## Known Issues & Workarounds

### Issue: [Describe Known Issue]
**Symptom:** What users experience
**Cause:** Root cause if known
**Workaround:** Temporary solution
**Status:** Link to tracking issue or PR
**ETA:** Expected resolution timeframe

---

## Escalation Paths

### When to Escalate
- Issue impacts multiple users or critical functionality
- Security vulnerability discovered
- Data integrity concerns
- Infrastructure/service outage
- Unable to resolve after following troubleshooting steps

### Contact Information
- **Level 1 - Development Team:** TODO: Add team contact (Slack, email)
- **Level 2 - Senior Engineers/Tech Leads:** TODO: Add contact
- **Level 3 - DevOps/Infrastructure:** TODO: Add contact
- **Emergency/Security:** TODO: Add 24/7 on-call contact

### Escalation Template
When escalating, provide:
1. Clear description of the issue
2. Steps to reproduce
3. Impact assessment (users affected, severity)
4. Troubleshooting steps already attempted
5. Relevant logs and error messages
6. Timeline and urgency

---

## Preventive Measures

### Monitoring & Alerts
- Set up alerts for error rate thresholds
- Monitor key performance indicators (response time, throughput)
- Configure health checks for critical services
- Set up uptime monitoring for external APIs

### Regular Maintenance
- Review and rotate logs regularly
- Update dependencies for security patches
- Monitor disk space and clean up old files
- Review and optimize slow database queries
- Conduct regular security audits

### Testing
- Maintain comprehensive test suite
- Run integration tests before deployment
- Conduct load testing for performance-critical features
- Test disaster recovery procedures

---

## Support Resources
- **Internal Documentation:** [Link to internal wiki/docs]
- **Team Chat:** TODO: Add Slack/Teams channel
- **Issue Tracker:** TODO: Add GitHub/Jira link
- **Runbooks:** TODO: Link to operational runbooks
- **Post-mortems:** TODO: Link to incident reports

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Review recent incident reports and add new common issues
2. Update diagnostic commands to match current tooling
3. Verify contact information and escalation paths are current
4. Add workarounds for newly discovered issues
5. Update log locations and monitoring tool links
6. Validate that debugging workflows match current setup
7. Add new error patterns from support tickets

<!-- agent-readonly:sources -->
## Acceptable Sources
- Post-mortem and incident reports
- Support ticket patterns and resolutions
- Production logs and error tracking systems
- Team knowledge base and runbooks
- Infrastructure and monitoring configurations

<!-- agent-update:end -->
`;
}