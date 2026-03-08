

## Architectural Insight

**Current Codebase Analysis:**
The MSHB project follows consistent patterns for user-server relationships (server_members, server_notification_prefs) with robust RLS policies and audit trails. The existing monetization infrastructure (marketplace_items, user_purchases, user_equipped) provides a foundation, but the Server Boost system introduces new complexity:

**Potential Edge Cases & Concerns:**
1. **Race Conditions**: Multiple users boosting/unboosting simultaneously could corrupt boost_count calculations
2. **Partial States**: Stripe webhook failures while database state changes could create inconsistencies  
3. **Performance**: Trigger calculations on every boost status change could impact database performance for popular servers
4. **Cascading Deletes**: Server/user deletions need careful handling of active boost subscriptions
5. **Real-time Consistency**: UI must reflect boost count changes immediately across all connected clients

**Recommended Patterns:**
- Use SECURITY DEFINER functions (like existing `is_server_admin`) for boost calculations to prevent RLS conflicts
- Follow existing audit log pattern for boost status changes
- Implement proper foreign key constraints with CASCADE options
- Use atomic transactions for multi-table updates

## Phase 1 Plan: Database Architecture & Core Logic

### Step 1: Create Migration for New Tables & Columns

**New Table: `user_boosts`**
```sql
CREATE TABLE public.user_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid REFERENCES public.servers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  stripe_subscription_id text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  canceled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

**Update `servers` table:**
```sql
ALTER TABLE public.servers 
ADD COLUMN boost_count integer NOT NULL DEFAULT 0,
ADD COLUMN boost_level integer NOT NULL DEFAULT 0;
```

**Update `server_members` table:**
```sql
ALTER TABLE public.server_members 
ADD COLUMN is_booster boolean NOT NULL DEFAULT false,
ADD COLUMN boosted_at timestamp with time zone;
```

### Step 2: Create RLS Policies for `user_boosts`

Following existing patterns for user-owned data:
- Users can view their own boosts
- Users can insert/update their own boosts
- Server admins can view boosts for their server
- No direct DELETE (status change only)

### Step 3: Create Core Functions

**Function 1: `calculate_server_boost_stats`**
- Calculates boost_count and boost_level for a given server
- Uses SECURITY DEFINER to avoid RLS conflicts
- Implements the level math: 0-1→Level 0, 2-6→Level 1, 7-13→Level 2, 14+→Level 3

**Function 2: `update_booster_status`**  
- Updates server_members.is_booster and boosted_at
- Handles the logic for when someone becomes/stops being a booster

### Step 4: Create Database Triggers

**Trigger 1: `update_server_boost_stats_trigger`**
- Fires on user_boosts INSERT/UPDATE/DELETE
- Calls calculate_server_boost_stats for affected server
- Updates servers.boost_count and servers.boost_level atomically

**Trigger 2: `update_booster_role_trigger`**
- Fires after server boost stats are updated
- Calls update_booster_status to maintain server_members.is_booster consistency

### Step 5: Add Indexes for Performance

Critical indexes for:
- user_boosts(user_id, server_id, status) - for boost queries
- user_boosts(server_id, status) - for server-wide counts
- server_members(server_id, is_booster) - for booster lists

### Step 6: Create Audit Trail Integration

Add boost-related actions to server_audit_logs:
- 'boost_started'
- 'boost_canceled' 
- 'boost_level_changed'

### Step 7: Handle Edge Cases

**Server Deletion Handling:**
- user_boosts.server_id ON DELETE SET NULL allows orphaned boosts
- These can be reassigned later or marked for Stripe cancellation

**User Deletion Handling:**
- user_boosts.user_id ON DELETE CASCADE cleans up boosts
- Triggers will automatically recalculate server stats

**Concurrency Protection:**
- Use SELECT ... FOR UPDATE in boost calculation functions
- Atomic transactions for multi-table updates

### Step 8: Add Validation Constraints

- user_boosts: unique(user_id, server_id) to prevent duplicate boosts per server
- servers: boost_count >= 0, boost_level >= 0 AND boost_level <= 3
- server_members: boosted_at only set when is_booster = true

### Migration Script Structure:
1. CREATE new tables with proper constraints
2. ALTER existing tables to add columns  
3. CREATE indexes for performance
4. CREATE functions with SECURITY DEFINER
5. CREATE triggers to maintain consistency
6. INSERT RLS policies following existing patterns
7. Add validation check constraints

This foundation provides:
- ✅ Atomic boost count calculations
- ✅ Automatic level progression
- ✅ Booster role management
- ✅ Race condition protection
- ✅ Audit trail integration
- ✅ Proper cleanup on deletions

Ready for Stripe webhook integration and UI implementation in subsequent phases.

