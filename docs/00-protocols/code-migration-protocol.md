# Code Migration Protocol

**Purpose:** Ensure comprehensive discovery and safe execution of field/variable migrations across the codebase.

**Last Updated:** November 24, 2025

---

## Overview

This protocol provides a systematic approach to migrating fields, variables, or data structures across a codebase. Following this process minimizes the risk of:
- ❌ Missing occurrences in code or documentation
- ❌ Breaking functionality due to incomplete analysis
- ❌ Data corruption from incorrect assumptions
- ❌ Having to redo migrations due to missed requirements

---

## Phase 1: Pre-Migration Discovery (REQUIRED)

**Goal:** Find EVERY occurrence of the field/variable before making ANY changes.

### Step 1.1: Comprehensive File Search

Search for the target field/variable across ALL file types:

**Required Searches:**

1. **Exact Match Search**
   ```
   Search for: "oldFieldName" (exact string)
   Include: ALL file types
   Document: Every single occurrence with context
   ```

2. **Code Files**
   - `*.ts`, `*.tsx` - TypeScript/React files
   - `*.js`, `*.jsx` - JavaScript files
   - `*.json` - Configuration files
   - `firestore.rules` - Security rules
   - `firestore.indexes.json` - Database indexes

3. **Documentation Files**
   - `*.md` - Markdown documentation
   - `*.txt` - Text files
   - Comments in code files

4. **Configuration & Environment**
   - `.env*` - Environment files
   - `*.yaml`, `*.yml` - Config files
   - `package.json` - Dependencies
   - `tsconfig.json` - TypeScript config

5. **Legacy & Static Files**
   - `static/*` - Legacy HTML/JS
   - `legacy-*/*` - Old implementations
   - Test files

### Step 1.2: Search for Variations

Search for alternative naming conventions:

- `old_field_name` (snake_case)
- `old-field-name` (kebab-case)
- `oldFieldName` (camelCase)
- `OldFieldName` (PascalCase)
- `OLD_FIELD_NAME` (SCREAMING_CASE)
- `"old field name"` (with spaces in strings)

### Step 1.3: Search for Usage Patterns

Search for how the field is used:

- `where.*oldFieldName` - Database queries
- `oldFieldName.*==` - Comparisons
- `oldFieldName:` - Object properties
- `.oldFieldName` - Property access
- `[oldFieldName]` - Dynamic access
- `{oldFieldName}` - Destructuring

### Step 1.4: Cross-Reference & Verify

**Verification Checklist:**
- [ ] Total count documented by file type
- [ ] Alternative search methods used to verify
- [ ] Zero unexpected patterns found
- [ ] All file types covered

**Present to User:**
```
Discovery Report:
Found 'oldFieldName' in:
- X TypeScript files
- X JavaScript files  
- X Markdown files
- X JSON files
- X other files
Total: X occurrences

File types searched: [list]
Search methods used: [list]

Ready to proceed with categorization?
```

**⚠️ STOP HERE - Get user confirmation before proceeding**

---

## Phase 2: Categorization & Analysis

**Goal:** Understand what each occurrence does and assess impact.

### Step 2.1: Categorize Each Occurrence

For EVERY occurrence found, document:

| File Path | Line | Context | Category | Impact | Notes |
|-----------|------|---------|----------|--------|-------|
| path/to/file.ts | 42 | Query filter | Read | High | Client dashboard access |
| path/to/doc.md | 15 | Documentation | Docs | Low | Update text only |

**Categories:**
- **Read** - Reading/querying the field
- **Write** - Setting/updating the field
- **Definition** - Type definitions, interfaces
- **Documentation** - Docs, comments, guides
- **Configuration** - Database indexes, rules

**Impact Levels:**
- **Critical** - Core functionality, security
- **High** - User-facing features
- **Medium** - Internal logic, utilities
- **Low** - Documentation, comments

### Step 2.2: Semantic Analysis

**Ask These Questions:**

1. **What does this field represent?**
   - Original intent?
   - Current usage?
   - Business logic tied to it?

2. **What are the valid values?**
   - Data type?
   - Possible values/states?
   - Validation rules?

3. **When is it set/updated?**
   - During creation?
   - On events?
   - By webhooks?

4. **What depends on it?**
   - Access control?
   - Business logic?
   - UI display?
   - Database queries?

5. **Are there conflicting patterns?**
   - Different meanings in different contexts?
   - Inconsistent usage?
   - Edge cases?

### Step 2.3: Risk Assessment

**Identify Risks:**

- [ ] Field has multiple meanings/contexts
- [ ] Field is used in security rules
- [ ] Field affects payment/billing logic
- [ ] Field is in database indexes
- [ ] Field is used in webhooks
- [ ] Field has string values that need mapping
- [ ] Field migration requires data migration

**Risk Matrix:**

| Risk Level | Criteria | Required Actions |
|------------|----------|------------------|
| **🔴 High** | Security/payments/access control | Extensive testing, rollback plan, gradual rollout |
| **🟡 Medium** | User-facing features | Testing, monitoring |
| **🟢 Low** | Documentation, internal utils | Standard testing |

### Step 2.4: Create Migration Plan

**Document:**

1. **Current State**
   - Field name: `oldFieldName`
   - Data type: `string | boolean`
   - Valid values: `["value1", "value2"]` or `true/false`
   - Location: `collection/document`

2. **Target State**
   - Field name: `newFieldName`
   - Data type: `boolean`
   - Value mapping: `"value1" → false`, `"value2" → true`
   - Location: Same

3. **Migration Strategy**
   - Code changes first? Or data first?
   - Need dual-write period?
   - Backward compatibility required?
   - Rollback strategy?

**⚠️ STOP HERE - Get user approval of migration plan**

---

## Phase 3: Implementation

**Goal:** Execute changes safely and systematically.

### Step 3.1: Change Order

**Recommended Order:**

1. ✅ **Database Indexes** - Add new, keep old
2. ✅ **Type Definitions** - Add new field to interfaces
3. ✅ **Write Operations** - Update all writes (dual-write if needed)
4. ✅ **Read Operations** - Update all reads (check both fields if needed)
5. ✅ **Security Rules** - Update access control
6. ✅ **Documentation** - Update all docs
7. ✅ **Deploy & Test**
8. ✅ **Data Migration** - Migrate existing data
9. ✅ **Cleanup** - Remove old field references after verification

### Step 3.2: Batch Changes by Type

**Group changes:**
- All code files together
- All documentation together
- All configuration together

**Use separate commits:**
```bash
git commit -m "feat: Add newFieldName to type definitions"
git commit -m "refactor: Update all newFieldName writes"
git commit -m "refactor: Update all newFieldName reads"  
git commit -m "docs: Update documentation for newFieldName"
git commit -m "chore: Update database indexes for newFieldName"
```

### Step 3.3: Implementation Checklist

- [ ] All code changes made
- [ ] All documentation updated
- [ ] All configuration updated
- [ ] Database indexes added
- [ ] Security rules updated
- [ ] Changes reviewed
- [ ] Tests updated/added

**⚠️ STOP HERE - Verify all changes before deployment**

---

## Phase 4: Deployment & Data Migration

**Goal:** Deploy changes safely and migrate existing data.

### Step 4.1: Deploy Code Changes

**Deployment Order:**

1. Deploy database indexes (wait for build completion)
2. Deploy Cloud Functions (if applicable)
3. Deploy application code
4. Monitor for errors

### Step 4.2: Data Migration Script

**Create migration script:**

```javascript
// migration-script.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateData() {
  const snapshot = await db.collection('collectionName').get();
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      
      // Skip if already migrated
      if (data.hasOwnProperty('newFieldName')) {
        skipped++;
        continue;
      }
      
      // Calculate new value from old value
      const newValue = mapOldToNew(data.oldFieldName);
      
      // Update document
      await doc.ref.update({
        newFieldName: newValue
      });
      
      migrated++;
      console.log(`✓ ${doc.id}: ${data.oldFieldName} → ${newValue}`);
      
    } catch (error) {
      errors++;
      console.error(`✗ ${doc.id}:`, error.message);
    }
  }
  
  console.log(`\nResults:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

function mapOldToNew(oldValue) {
  // Add mapping logic here
  switch (oldValue) {
    case 'value1': return false;
    case 'value2': return true;
    default: return false; // safe default
  }
}

migrateData().then(() => process.exit(0));
```

**Run migration:**
```bash
cd firebase/functions
node migration-script.js
```

### Step 4.3: Verification

**After deployment:**

- [ ] All indexes built successfully
- [ ] No errors in function logs
- [ ] Application loads correctly
- [ ] Test all affected features
- [ ] Verify data migration completed
- [ ] Check error rates in monitoring

---

## Phase 5: Post-Migration Verification

**Goal:** Confirm migration was successful and complete.

### Step 5.1: Functional Testing

**Test all affected features:**

- [ ] User authentication flows
- [ ] Dashboard access controls
- [ ] Payment/billing features
- [ ] Database queries return correct results
- [ ] Security rules work as expected
- [ ] UI displays correctly

### Step 5.2: Data Verification

**Verify data integrity:**

```javascript
// verification-script.js
async function verifyMigration() {
  const snapshot = await db.collection('collectionName').get();
  
  let withNew = 0;
  let withoutNew = 0;
  let inconsistent = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    if (data.hasOwnProperty('newFieldName')) {
      withNew++;
      
      // Check if mapping is correct
      if (data.hasOwnProperty('oldFieldName')) {
        const expectedNew = mapOldToNew(data.oldFieldName);
        if (data.newFieldName !== expectedNew) {
          inconsistent++;
          console.warn(`Inconsistent: ${doc.id}`);
        }
      }
    } else {
      withoutNew++;
      console.error(`Missing newFieldName: ${doc.id}`);
    }
  }
  
  console.log(`\nVerification Results:`);
  console.log(`  With new field: ${withNew}`);
  console.log(`  Missing new field: ${withoutNew}`);
  console.log(`  Inconsistent mappings: ${inconsistent}`);
}
```

### Step 5.3: Cleanup (Optional)

**After verification period (1-2 weeks):**

1. Remove old field from code (if no longer needed)
2. Delete old database indexes
3. Remove old field from security rules
4. Update documentation to reflect cleanup
5. Remove dual-write logic (if used)

---

## Common Pitfalls to Avoid

### ❌ Don't Do This:
- Start coding before complete discovery
- Assume limited search findings are complete
- Change code and documentation in different commits
- Skip the verification step
- Migrate data before deploying code
- Remove old field too quickly

### ✅ Do This Instead:
- Complete discovery phase fully
- Verify findings with multiple methods
- Batch related changes together
- Always verify before proceeding
- Deploy code before migrating data
- Keep old field during transition period

---

## Templates

### Discovery Report Template

```markdown
## Migration Discovery Report

**Field:** `oldFieldName` → `newFieldName`
**Date:** YYYY-MM-DD
**Analyst:** [Your name]

### Search Results

**Total Occurrences:** X

**By File Type:**
- TypeScript/React: X files
- Documentation: X files
- Configuration: X files
- Other: X files

**By Category:**
- Read operations: X
- Write operations: X
- Type definitions: X
- Documentation: X
- Database indexes: X

### Search Methods Used
1. Exact string match
2. Regex patterns
3. [Other methods]

### Files Affected
[Detailed list of all affected files]

### Verification
- [ ] All file types searched
- [ ] Alternative naming conventions checked
- [ ] Cross-referenced with multiple methods
- [ ] No unexpected patterns found

### Next Steps
[What to do next]
```

### Risk Assessment Template

```markdown
## Migration Risk Assessment

**Field:** `oldFieldName` → `newFieldName`

### Risk Level: [🔴 High / 🟡 Medium / 🟢 Low]

### Risk Factors
- [ ] Affects security/access control
- [ ] Affects payment/billing
- [ ] Used in database indexes
- [ ] Multiple semantic meanings
- [ ] Complex value mapping required
- [ ] Requires data migration

### Impact Analysis
**If migration fails:**
- [List potential impacts]

**Affected users:**
- [Who is affected]

**Affected features:**
- [Which features break]

### Mitigation Strategy
1. [Step 1]
2. [Step 2]
3. [Rollback plan]

### Testing Requirements
- [ ] [Test scenario 1]
- [ ] [Test scenario 2]
```

---

## Usage Instructions

**For any field/variable migration:**

1. Reference this document at the start
2. Complete Phase 1 fully before proceeding
3. Get user approval at each STOP point
4. Document everything
5. Follow the order strictly
6. Verify at each step

**Never skip:**
- ⚠️ Pre-migration discovery
- ⚠️ Risk assessment
- ⚠️ User approval points
- ⚠️ Post-migration verification

---

## Document History

- **v1.0** (2025-11-24) - Initial protocol created based on `paymentStatus` → `accountActivated` migration lessons learned

---

## Related Documents

- [Account First Signup Implementation](../02-implementation/account-first-signup-implementation.md)
