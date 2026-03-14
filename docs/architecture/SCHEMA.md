# Database Schema Reference — Beauty OS / AgenX AIOX

**Mapeado em:** 14 Mar 2026 | **Fase:** 4.2a (Database Schema) | **Agent:** @data-engineer (Dara)

**Fonte canônica:** `.gemini/antigravity/brain/c118f576.../implementation_plan.md`

---

## 19 Core Tables (Multi-Tenant)

### Group 1: Auth & Profile (2 tables)

#### `profiles`
User account and business profile

| Column | Type | Constraints | Notes |
|--------|------|---|---|
| `id` | UUID | PK, FK → `auth.users(id)` | Same as auth.uid() |
| `email` | TEXT | — | User email |
| `full_name` | TEXT | — | Full name |
| `business_name` | TEXT | — | Business/salon name |
| `phone` | TEXT | — | Contact phone |
| `user_type` | TEXT | DEFAULT `'barber'` | `'barber'` or `'beauty'` |
| `region` | TEXT | DEFAULT `'BR'` | `'BR'` or `'PT'` |
| `logo_url` | TEXT | — | URL in `logos` bucket |
| `cover_photo_url` | TEXT | — | URL in `covers` bucket |
| `address_street` | TEXT | — | Business address |
| `instagram_handle` | TEXT | — | Instagram username |
| `public_booking_enabled` | BOOLEAN | DEFAULT `false` | Enable public portal |
| `booking_lead_time_hours` | INTEGER | DEFAULT `2` | Min advance booking |
| `max_bookings_per_day` | INTEGER | DEFAULT `20` | Daily limit |
| `business_slug` | TEXT | UNIQUE | URL slug `/b/{slug}` |
| `monthly_goal` | NUMERIC | — | Revenue target (fallback) |
| `aios_enabled` | BOOLEAN | DEFAULT `false` | AI features active |
| `aios_features` | JSONB | DEFAULT `{}` | Feature flags |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** SELECT public (for booking), UPDATE restricted to owner

---

#### `business_settings`
Operational configuration

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)`, UNIQUE | 1:1 relationship |
| `business_hours` | JSONB | — | `{mon: {isOpen, blocks[]}, ...}` |
| `cancellation_policy` | TEXT | DEFAULT `'flexible'` | Policy text |
| `onboarding_completed` | BOOLEAN | DEFAULT `false` | Setup done |
| `onboarding_step` | INTEGER | DEFAULT `1` | Current step (1-5) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restricted to auth.uid() = user_id

---

### Group 2: Team & Services (4 tables)

#### `team_members`
Professionals (barbers, stylists, etc.)

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Business owner |
| `business_id` | UUID | FK → `auth.users(id)` | Multi-user support |
| `name` | TEXT | NOT NULL | Professional name |
| `role` | TEXT | NOT NULL | Job title |
| `bio` | TEXT | — | Portfolio bio |
| `photo_url` | TEXT | — | Photo in `team_photos` bucket |
| `active` | BOOLEAN | DEFAULT `true` | Soft status |
| `display_order` | INTEGER | DEFAULT `0` | Display sequence |
| `slug` | VARCHAR(100) | UNIQUE | Personal URL `/p/{slug}` |
| `commission_rate` | DECIMAL(5,2) | — | Commission % |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL where auth.uid() = user_id OR is_staff_of(user_id)
**Index:** `(user_id, deleted_at)` for soft-delete queries

---

#### `service_categories`
Service grouping (e.g., "Haircut", "Coloring")

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Owner |
| `name` | TEXT | NOT NULL | Category name |
| `display_order` | INTEGER | DEFAULT `0` | UI ordering |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restricted to auth.uid() = user_id

---

#### `services`
Individual services offered

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Owner |
| `category_id` | UUID | FK → `service_categories(id)` ON DELETE SET NULL | Group |
| `name` | TEXT | NOT NULL | Service name |
| `description` | TEXT | — | Marketing copy |
| `price` | DECIMAL(10,2) | NOT NULL | Price (R$) |
| `duration_minutes` | INTEGER | NOT NULL | Duration |
| `image_url` | TEXT | — | Photo in `service_images` |
| `active` | BOOLEAN | DEFAULT `true` | Soft status |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL where auth.uid() = user_id OR is_staff_of(user_id)
**Index:** `(user_id, active, category_id)` for filtering

---

#### `service_upsells`
Many-to-many service recommendations

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` | Owner |
| `parent_service_id` | UUID | FK → `services(id)` ON DELETE CASCADE | Main service |
| `upsell_service_id` | UUID | FK → `services(id)` ON DELETE CASCADE | Suggested add-on |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restricted to auth.uid() = user_id
**Example:** "Haircut" upsells "Hot towel treatment"

---

### Group 3: Clients & Appointments (3 tables)

#### `clients`
Internal CRM (authenticated clients)

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` DEFAULT `auth.uid()` | Owner |
| `name` | TEXT | NOT NULL | Client name |
| `email` | TEXT | — | Email |
| `phone` | TEXT | — | Phone |
| `loyalty_tier` | TEXT | DEFAULT `'Bronze'` | `'Bronze'`, `'Silver'`, `'Gold'` |
| `total_visits` | INTEGER | DEFAULT `0` | Visit counter |
| `notes` | TEXT | — | Internal notes |
| `photo_url` | TEXT | — | Photo in `client_photos` |
| `rating` | DECIMAL(2,1) | CHECK 0–5, DEFAULT `0` | Client rating |
| `last_visit` | TIMESTAMPTZ | — | Last appointment |
| `next_prediction` | TEXT | — | AI prediction |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL where auth.uid() = user_id OR is_staff_of(user_id)
**Trigger:** `audit_clients` logs all changes
**Index:** `(user_id, loyalty_tier)`, `(user_id, last_visit DESC)`

---

#### `appointments`
Internal scheduling (created by owner/staff)

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` DEFAULT `auth.uid()` | Business owner |
| `client_id` | UUID | FK → `clients(id)` ON DELETE CASCADE | Client |
| `professional_id` | UUID | FK → `team_members(id)` ON DELETE SET NULL | Professional |
| `service` | TEXT | NOT NULL | Service name (text) |
| `appointment_time` | TIMESTAMPTZ | NOT NULL | Date & time |
| `price` | DECIMAL(10,2) | NOT NULL | Amount charged |
| `status` | TEXT | DEFAULT `'Pending'` | `'Pending'`, `'Confirmed'`, `'Completed'`, `'Cancelled'` |
| `notes` | TEXT | — | Internal notes |
| `payment_method` | TEXT | — | `'pix'`, `'dinheiro'`, `'cartao'` |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL where auth.uid() = user_id OR is_staff_of(user_id)
**Trigger:** `audit_appointments` logs changes
**Indexes:**
- `(user_id, appointment_time, status)` — main query pattern
- `(deleted_at) WHERE deleted_at IS NOT NULL` — soft-delete queries

---

### Group 4: Public Booking (3 tables)

#### `public_clients`
Clients from public portal (no auth account)

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `business_id` | UUID | FK → `profiles(id)` ON DELETE CASCADE | Business |
| `name` | VARCHAR(255) | NOT NULL | Client name |
| `email` | VARCHAR(255) | — | Email |
| `phone` | VARCHAR(50) | NOT NULL | Phone |
| `photo_url` | TEXT | — | Profile photo |
| `google_id` | VARCHAR(255) | — | OAuth future |
| `last_booking_at` | TIMESTAMPTZ | — | Last booking |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| **UNIQUE** | — | `(business_id, phone)` | One per phone per business |

**RLS:** INSERT public, SELECT/ALL for auth.uid() = business_id

---

#### `public_bookings`
Booking requests from public portal

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `business_id` | UUID | FK → `profiles(id)` | Target business |
| `customer_name` | TEXT | NOT NULL | Name |
| `customer_phone` | TEXT | NOT NULL | Phone |
| `customer_email` | TEXT | — | Email |
| `service_ids` | UUID[] | — | Selected services |
| `professional_id` | UUID | FK → `team_members(id)` | Preferred staff |
| `appointment_time` | TIMESTAMPTZ | NOT NULL | Requested time |
| `total_price` | DECIMAL | — | Calculated total |
| `duration_minutes` | INTEGER | — | Estimated duration |
| `status` | TEXT | DEFAULT `'pending'` | `'pending'`, `'confirmed'`, `'cancelled'`, `'completed'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** INSERT public, SELECT/UPDATE for auth.uid() = business_id
**Used by:** `get_available_slots`, `create_secure_booking`

---

#### `queue_entries`
Virtual waiting queue (no appointment time)

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | — |
| `business_id` | UUID | FK → `profiles(id)` ON DELETE CASCADE | Business |
| `client_name` | VARCHAR(255) | NOT NULL | Name |
| `client_phone` | VARCHAR(50) | NOT NULL | Phone |
| `service_id` | UUID | FK → `services(id)` ON DELETE SET NULL | Requested service |
| `professional_id` | UUID | FK → `team_members(id)` ON DELETE SET NULL | Preferred staff |
| `status` | VARCHAR(50) | DEFAULT `'waiting'` | `waiting`, `calling`, `serving`, `completed`, `cancelled`, `no_show` |
| `joined_at` | TIMESTAMPTZ | DEFAULT NOW() | Entry time |
| `estimated_wait_time` | INTEGER | — | Minutes |
| `notes` | TEXT | — | Notes |

**RLS:** INSERT public, SELECT for status='active', ALL for owner
**Indexes:** `(business_id, status)`, `(joined_at DESC)`

---

### Group 5: Finance (1 table)

#### `finance_records`
Revenue and expenses

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` DEFAULT `auth.uid()` | Owner |
| `professional_id` | UUID | FK → `team_members(id)` | For commission |
| `appointment_id` | UUID | FK → `appointments(id)` | Source |
| `barber_name` | TEXT | — | Snapshot |
| `client_name` | TEXT | — | Snapshot |
| `service_name` | TEXT | — | Snapshot |
| `revenue` | DECIMAL(10,2) | NOT NULL | Amount |
| `commission_rate` | DECIMAL(5,2) | DEFAULT `0` | % |
| `commission_value` | DECIMAL(10,2) | DEFAULT `0` | Amount (R$) |
| `commission_paid` | BOOLEAN | DEFAULT `false` | Paid? |
| `commission_paid_at` | TIMESTAMPTZ | — | Payment date |
| `auto_split` | BOOLEAN | DEFAULT `false` | Auto-split? |
| `type` | TEXT | DEFAULT `'expense'` | `'revenue'` or `'expense'` |
| `description` | TEXT | — | For expenses |
| `category` | TEXT | — | Expense category |
| `status` | TEXT | DEFAULT `'paid'` | `'paid'` or `'pending'` |
| `due_date` | TIMESTAMP | — | For pending |
| `payment_method` | TEXT | — | How paid |
| `deleted_at` | TIMESTAMPTZ | — | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL where auth.uid() = user_id OR is_staff_of(user_id)
**Trigger:** `audit_financial_records`
**Indexes:**
- `(user_id, created_at DESC)` — financial statements
- `(user_id, type, status)` — filtering

---

### Group 6: Content & Marketing (2 tables)

#### `content_calendar`
AI-generated social media content

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` NOT NULL | Owner |
| `date` | DATE | NOT NULL | Publication date |
| `content_type` | TEXT | NOT NULL | `'carousel'`, `'reel'`, `'story'`, `'post'` |
| `topic` | TEXT | NOT NULL | Content theme |
| `caption` | TEXT | NOT NULL | Generated caption |
| `hashtags` | TEXT[] | NOT NULL | Tag array |
| `posting_time` | TIME | — | Suggested time |
| `status` | TEXT | DEFAULT `'pending'` | `'pending'`, `'posted'`, `'skipped'` |
| `ai_generated` | BOOLEAN | DEFAULT `true` | AI or manual |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restricted to auth.uid() = user_id
**Index:** `(user_id, date DESC)`

---

#### `marketing_assets`
AI-edited images for campaigns

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` NOT NULL | Owner |
| `original_image_url` | TEXT | NOT NULL | Original photo URL |
| `edited_image_url` | TEXT | — | Edited version URL |
| `caption` | TEXT | — | Suggested caption |
| `hashtags` | TEXT[] | — | Tag suggestions |
| `ai_suggestions` | JSONB | — | Structured suggestions |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restricted to auth.uid() = user_id

---

### Group 7: Hair Records (1 table)

#### `hair_records`
Visual history of cuts per client

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | FK → `auth.users(id)` NOT NULL | Owner |
| `client_id` | UUID | FK → `clients(id)` ON DELETE CASCADE | Client |
| `service` | TEXT | NOT NULL | Service name |
| `barber` | TEXT | — | Professional name |
| `date` | TIMESTAMPTZ | DEFAULT NOW() | Service date |
| `image_url` | TEXT | — | Result photo |
| `notes` | TEXT | — | Notes |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL restricted to auth.uid() = user_id

---

## 8 Audit & System Tables

#### `audit_logs`
Complete immutable audit trail

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE SET NULL | User |
| `action` | VARCHAR(50) | CHECK enum | CREATE, UPDATE, DELETE, LOGIN, etc. |
| `resource_type` | VARCHAR(100) | NOT NULL | Table name |
| `resource_id` | UUID | — | Affected row |
| `old_values` | JSONB | — | Previous state |
| `new_values` | JSONB | — | New state |
| `ip_address` | INET | — | User IP |
| `user_agent` | TEXT | — | Browser/client |
| `request_method` | VARCHAR(10) | — | HTTP method |
| `request_path` | TEXT | — | API path |
| `metadata` | JSONB | DEFAULT `{}` | Extra info |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | — |

**RLS:** INSERT public, SELECT restricted, UPDATE/DELETE blocked
**Indexes:**
- `(user_id, created_at DESC)` — user activity
- `(resource_type, resource_id, created_at DESC)` — resource history
- `(action, created_at DESC)` — action timeline
- GIN on `metadata`

---

#### `system_errors`
Frontend and backend error logs

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `error_message` | TEXT | NOT NULL | Error text |
| `stack_trace` | TEXT | — | Stack trace |
| `component_stack` | TEXT | — | React component stack |
| `severity` | VARCHAR(20) | CHECK enum | `'info'`, `'warning'`, `'error'`, `'critical'` |
| `context` | JSONB | DEFAULT `{}` | URL, Browser, OS |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE SET NULL | User |
| `resolved` | BOOLEAN | DEFAULT `false` | Fixed? |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | — |

**RLS:** INSERT for all, SELECT for auth.uid() = user_id

---

#### `aios_logs`
AI agent decision logs

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | — |
| `user_id` | UUID | FK → `auth.users(id)` NOT NULL | Business |
| `agent_name` | TEXT | NOT NULL | Agent ID |
| `action_type` | TEXT | NOT NULL | `'suggestion'`, `'execution'`, `'learning'` |
| `content` | JSONB | NOT NULL | Action payload |
| `metadata` | JSONB | DEFAULT `{}` | Extra data |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** SELECT/INSERT restricted to auth.uid() = user_id
**Indexes:** `(user_id, agent_name)`, `(created_at DESC)`

---

#### `ai_knowledge_base`
Vector embeddings for RAG

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `content` | TEXT | NOT NULL | Text content |
| `embedding` | VECTOR(768) | — | Gemini embedding |
| `metadata` | JSONB | DEFAULT `{}` | Source info |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** SELECT for all authenticated
**Index:** HNSW `(embedding vector_cosine_ops)`

---

#### `client_semantic_memory`
Client preference vectors

| Column | Type | Constraint | Notes |
|--------|------|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | — |
| `client_id` | UUID | FK → `clients(id)` ON DELETE CASCADE | Client |
| `observation` | TEXT | NOT NULL | Text observation |
| `embedding` | VECTOR(768) | — | Gemini embedding |
| `context_type` | VARCHAR(50) | — | `'style'`, `'preference'`, `'habit'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | — |

**RLS:** ALL for authenticated (todo: filter by user_id)
**Index:** HNSW `(embedding vector_cosine_ops)`

---

#### `rate_limits` (UNLOGGED)
Token Bucket for rate limiting

| Column | Type | Notes |
|--------|------|---|
| `key` | TEXT | PK. Format: `'login:{email}'` |
| `tokens` | INTEGER | Available tokens |
| `last_refill` | TIMESTAMPTZ | Last refill time |

**No RLS** — access only via SECURITY DEFINER functions
**Volatile data** — reset on server restart

---

## Summary

| Category | Count | Total Size | Notes |
|----------|-------|-----------|-------|
| Core Tables | 19 | ~50MB | Business data |
| Audit/System | 8 | ~20MB | Logs & metadata |
| **Total** | **27** | **~70MB** | Current estimate |

**Storage Buckets:** 6 (logos, covers, team_photos, service_images, client_photos, marketing_images)

**RLS Status:** ✅ ENABLED on all 27 tables

**Next:** Phase 4.2 continued in `DB-AUDIT.md` (performance checks, missing indexes, optimization opportunities)
