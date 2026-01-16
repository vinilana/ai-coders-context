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

export function renderMigration(): string {
  const content = `# Migration Guide

Complete guide for upgrading between versions, handling breaking changes, and migrating data.

## Current Version
**Latest Stable:** TODO: Add current version (e.g., v2.5.0)
**Release Date:** TODO: Add date

## Version Support Policy
- **Current major version:** Full support with security patches and bug fixes
- **Previous major version:** Security patches only for 12 months after new major release
- **Older versions:** No longer supported, upgrade strongly recommended

## Before You Migrate
### Pre-Migration Checklist
- [ ] **Backup all data** - Create complete backup of database and file storage
- [ ] **Review changelog** - Read release notes for the target version
- [ ] **Test in staging** - Run full migration in non-production environment first
- [ ] **Check dependencies** - Verify all dependencies are compatible
- [ ] **Notify stakeholders** - Communicate migration timeline and potential downtime
- [ ] **Plan rollback** - Prepare rollback procedure in case of issues
- [ ] **Schedule maintenance window** - Plan for adequate downtime if needed

### System Requirements
Before upgrading, verify your environment meets the new requirements:
- **Node.js version:** TODO: e.g., >= 18.0.0
- **Database version:** TODO: e.g., PostgreSQL >= 14.0
- **Operating System:** TODO: List supported OS versions
- **Memory:** TODO: Minimum RAM requirements
- **Disk space:** TODO: Required free space

---

## Migration Paths

### Upgrading to v3.0 (Latest)

#### From v2.x → v3.0

**Overview:**
Major version upgrade with breaking changes. Migration estimated at 2-4 hours depending on data volume.

**Breaking Changes:**
1. **API endpoint restructuring**
   - Old: \`/api/users/:id\`
   - New: \`/api/v3/users/:id\`
   - Migration: Update all API client code to use new base path

2. **Authentication changes**
   - JWT token format changed
   - Users must re-authenticate after upgrade
   - Migration: Implement token migration middleware or force re-login

3. **Database schema changes**
   - \`users\` table: Added \`email_verified_at\` column
   - \`sessions\` table: Renamed to \`user_sessions\`
   - Migration: Automatic via migration scripts

4. **Configuration format**
   - Environment variables renamed:
     - \`DB_HOST\` → \`DATABASE_URL\`
     - \`REDIS_HOST\` → \`CACHE_URL\`
   - Migration: Update .env file with new variable names

**Step-by-Step Migration:**

1. **Create backup**
   \`\`\`bash
   # Database backup
   pg_dump -U postgres dbname > backup_v2.sql

   # Application backup
   tar -czf app_v2_backup.tar.gz /path/to/app
   \`\`\`

2. **Update dependencies**
   \`\`\`bash
   # Update package.json to v3.0
   npm install app-name@3.0.0

   # Install updated dependencies
   npm install
   \`\`\`

3. **Update configuration**
   \`\`\`bash
   # Update environment variables
   # Rename variables in .env file
   DATABASE_URL=postgresql://user:pass@localhost:5432/db
   CACHE_URL=redis://localhost:6379
   \`\`\`

4. **Run database migrations**
   \`\`\`bash
   # Dry run to preview changes
   npm run migrate:preview

   # Execute migrations
   npm run migrate:up

   # Verify migration success
   npm run migrate:status
   \`\`\`

5. **Update application code**
   - Update API client base URLs
   - Replace deprecated function calls
   - Update import paths if modules were reorganized

6. **Test the application**
   \`\`\`bash
   # Run full test suite
   npm test

   # Start application
   npm start

   # Verify critical functionality
   # - User authentication
   # - Core API endpoints
   # - Database operations
   \`\`\`

7. **Monitor after deployment**
   - Check error logs for unexpected issues
   - Monitor performance metrics
   - Verify data integrity

**Rollback Procedure (if needed):**
\`\`\`bash
# Stop application
npm stop

# Restore database backup
psql -U postgres dbname < backup_v2.sql

# Revert to previous version
npm install app-name@2.x.x

# Restore old configuration
# Revert environment variables to v2 format

# Restart application
npm start
\`\`\`

---

#### From v1.x → v3.0

**Important:** Direct upgrade from v1.x to v3.0 is not supported. Please upgrade incrementally:
1. v1.x → v2.0
2. v2.0 → v3.0

Refer to the sections below for each migration step.

---

### Upgrading to v2.0

#### From v1.x → v2.0

**Breaking Changes:**
1. **Database ORM change**
   - Migrated from custom ORM to Prisma
   - Requires regenerating database schema

2. **Configuration file format**
   - Moved from JSON config to environment variables
   - Migration: Convert config.json values to .env

3. **API response format**
   - Standardized error response structure
   - Migration: Update API client error handling

**Step-by-Step Migration:**

1. **Backup and preparation**
   \`\`\`bash
   # Create backup
   pg_dump -U postgres dbname > backup_v1.sql

   # Install v2.0
   npm install app-name@2.0.0
   \`\`\`

2. **Configure environment**
   \`\`\`bash
   # Convert config.json to .env
   # Use provided migration script
   node scripts/config-to-env.js config.json > .env
   \`\`\`

3. **Migrate database schema**
   \`\`\`bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations
   npx prisma migrate deploy
   \`\`\`

4. **Update code**
   - Replace old ORM queries with Prisma queries
   - Update error handling for new response format

5. **Test and deploy**

---

## Data Migration

### Database Migrations

#### Running Migrations
\`\`\`bash
# Check current migration status
npm run migrate:status

# Preview migrations without applying
npm run migrate:preview

# Apply all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Rollback to specific version
npm run migrate:to 20240115_initial
\`\`\`

#### Creating Custom Migrations
\`\`\`bash
# Generate new migration file
npm run migrate:create add_user_roles

# Edit generated file at migrations/YYYYMMDD_add_user_roles.js
# Implement up() and down() functions
\`\`\`

**Example Migration:**
\`\`\`javascript
// migrations/20240115_add_user_roles.js
exports.up = async (db) => {
  await db.schema.createTable('user_roles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('users.id');
    table.string('role').notNullable();
    table.timestamps();
  });
};

exports.down = async (db) => {
  await db.schema.dropTable('user_roles');
};
\`\`\`

### Data Transformation

#### Large Dataset Migration
For large datasets that can't be migrated in a single transaction:

\`\`\`bash
# Use batch migration script
node scripts/migrate-data-batch.js \\
  --source=old_table \\
  --target=new_table \\
  --batch-size=1000 \\
  --delay=100

# Monitor progress
tail -f logs/migration.log
\`\`\`

#### Zero-Downtime Migration
For production migrations with no downtime:

1. **Dual-write phase**
   - Write to both old and new schema
   - Read from old schema

2. **Backfill phase**
   - Migrate historical data in batches
   - Verify data integrity

3. **Dual-read phase**
   - Continue writing to both
   - Switch reads to new schema
   - Monitor for issues

4. **Cleanup phase**
   - Stop writing to old schema
   - Archive or drop old tables

---

## Deprecation Timeline

### Currently Deprecated (Remove in next major version)
- **Function:** \`oldApiCall()\` → Use \`newApiCall()\` instead
- **Endpoint:** \`/api/legacy/*\` → Use \`/api/v3/*\` instead
- **Configuration:** \`LEGACY_MODE=true\` → No longer needed

### Deprecated in v2.0 (Removed in v3.0)
- Legacy authentication system
- Old database ORM
- JSON configuration format

---

## Backward Compatibility

### Maintaining Compatibility
- Feature flags to toggle between old and new behavior
- Adapter layer for deprecated APIs
- Automatic data format conversion where possible

### Compatibility Mode
Enable compatibility mode during transition period:
\`\`\`bash
# .env
COMPATIBILITY_MODE=true
LEGACY_API_ENABLED=true
\`\`\`

**Warning:** Compatibility mode has performance overhead and should only be used temporarily.

---

## Common Migration Issues

### Issue: Migration Fails Midway
**Solution:**
1. Check migration logs for specific error
2. Fix underlying issue (permissions, constraints, etc.)
3. Resume migration or rollback and retry

### Issue: Data Inconsistency After Migration
**Solution:**
1. Run data validation scripts
2. Compare row counts between old and new tables
3. Use migration verification tools
4. Re-run failed batch migrations

### Issue: Performance Degradation
**Solution:**
1. Rebuild database indexes: \`npm run db:reindex\`
2. Update query optimizer statistics: \`ANALYZE;\`
3. Review query plans for new schema
4. Consider adding new indexes for changed access patterns

---

## Migration Scripts & Tools

### Available Scripts
\`\`\`bash
# Data validation
npm run validate:migration

# Dry run migration (no changes)
npm run migrate:dry-run

# Generate migration report
npm run migrate:report > migration-report.txt

# Performance test after migration
npm run test:performance
\`\`\`

### Third-Party Tools
- **DB migration tools:** Flyway, Liquibase
- **Data comparison:** DbDiff, Schema Spy
- **Performance testing:** Apache Bench, k6

---

## Getting Help

### Migration Support
- **Documentation:** [Link to detailed migration docs]
- **Support channel:** TODO: Add Slack/Discord channel
- **Migration assistance:** TODO: Add contact for migration help
- **Issue tracker:** TODO: Link to migration issues

### Reporting Migration Issues
When reporting migration problems, include:
1. Source version and target version
2. Full error message and stack trace
3. Migration log output
4. Database type and version
5. Steps to reproduce
`;

  return wrapWithFrontMatter(content);
}