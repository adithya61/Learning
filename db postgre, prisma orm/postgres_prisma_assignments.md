# PostgreSQL & Prisma — Assignment Track

**Goal:** Build genuine understanding of relational databases and Prisma ORM before touching auth.  
**Structure:** Part 1 is pure PostgreSQL (raw SQL, no ORM). Part 2 is pure Prisma. Part 3 combines both.  
**Why this order:** You need to know what Prisma is doing *for you* before you use it. If you've only ever used Prisma, you won't understand what a JOIN is, why indexes matter, or what a transaction actually does. Part 1 builds that foundation.

---

## Prerequisites Before You Start

- You have PostgreSQL installed and running (`psql postgres` opens a prompt)
- You have TablePlus (or any GUI) connected to your local Postgres
- You know what a terminal is and are comfortable running commands
- You have Node.js and npm installed

That's it. No prior database knowledge required — that's what Part 1 is for.

---

## PART 1 — PostgreSQL (Raw SQL)

No Node.js yet. No Prisma yet. Just you, `psql`, and raw SQL. The goal is to understand databases at the metal level so that Prisma's abstractions make sense.

---

### PG-E1 — Setup, the psql CLI, and Your First Database

**Objective:** Get comfortable with the PostgreSQL CLI and understand the basic structure of a relational database — databases, tables, rows, columns.

**What you'll build:** A `library_db` database with a single `books` table, populated and queried entirely from the terminal.

**Tasks:**

1. Create a database: `createdb library_db`. Connect to it: `psql library_db`.
2. Create a `books` table with these columns: 
 `id` (SERIAL PRIMARY KEY),
 `title` (VARCHAR(255) NOT NULL),
  `author` (VARCHAR(255) NOT NULL), 
  `published_year` (INTEGER), 
  `available` (BOOLEAN DEFAULT true).
3. Insert at least 5 books using `INSERT INTO`.
4. Practice these queries one by one, understanding each output:
   - `SELECT * FROM books;`
   - `SELECT title, author FROM books WHERE available = true;`
   - `SELECT * FROM books WHERE published_year > 2000;`
   - `SELECT * FROM books ORDER BY published_year DESC;`
   - `SELECT * FROM books LIMIT 3;`
5. Update one book: set `available = false` for a specific book by its `id`.
6. Delete one book by `id`.
7. Learn these `psql` meta-commands: `\l` (list databases), `\c` (connect to db), `\dt` (list tables), `\d books` (describe table structure), `\q` (quit).

**Topics covered:** DDL vs DML, SERIAL primary keys, data types, WHERE, ORDER BY, LIMIT, UPDATE, DELETE, psql CLI navigation.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Primary key type | SERIAL (auto-increment) | No primary key defined |
| NOT NULL constraint | On title and author | Missing — nulls allowed |
| UPDATE targets specific row | Uses `WHERE id = ?` | Updates all rows accidentally |
| DELETE targets specific row | Uses `WHERE id = ?` | Deletes all rows accidentally |
| \d books output | Shows correct types and constraints | Column types are wrong |
| Can describe what SERIAL does | Yes | "I just copied it" |

**Stretch goals:**
- Add a `genre` column to the existing table using `ALTER TABLE books ADD COLUMN genre VARCHAR(100);`
- Select only books where `published_year` is between 1990 and 2010 using `BETWEEN`

#### Solution

```
-- create table books (
-- 	id serial primary key,
-- 	published_year int,
-- 	title varchar(255) not null,
-- 	author varchar(255),
-- 	available boolean default true
-- );

-- insert into books (published_year, available, title, author)
-- values 
-- 	(1999, true, 'the beginners mind', 'miyamoto mushashi'),
-- 	(2001, true, 'deep work', 'sigma range'),
-- 	(1985, true, 'the five rings', 'albert'),
-- 	(1980, true, 'influence', 'ron johnowick');


-- select * from books;

-- alter table books add column genre varchar(100);

```

---

### PG-E2 — Data Types & Constraints

**Objective:** Understand the full range of PostgreSQL data types and how constraints enforce data integrity at the database level — not just in your application code.

**What you'll build:** A `users` table that enforces real-world rules — no duplicate emails, no nulls where they shouldn't be, valid age ranges — using constraints alone.

**Tasks:**

1. Create a new database `constraints_db`. Create a `users` table with: 
`id` (UUID, use 
`gen_random_uuid()` as default), 
`email` (TEXT, UNIQUE, NOT NULL), 
`username` (VARCHAR(50), NOT NULL), 
`age` (INTEGER, CHECK age >= 13), 
`bio` (TEXT, nullable), 
`is_active` (BOOLEAN, NOT NULL, DEFAULT true), 
`created_at` (TIMESTAMPTZ, DEFAULT NOW()).
2. Enable the UUID extension first: 
`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
3. Try to insert a user with a duplicate email. Observe the error message Postgres gives you. Write down what the error says.
4. Try to insert a user with `age = 10`. Observe the CHECK constraint error.
5. Try to insert a user with `email = NULL`. Observe the NOT NULL error.
6. Insert 3 valid users. Then query: all users created in the last hour, all active users, all users where `bio` IS NULL vs IS NOT NULL.
7. Write a comment (in your notes) explaining the difference between VARCHAR(50) and TEXT. When would you use each?

**Topics covered:** UUID vs SERIAL, gen_random_uuid(), TEXT vs VARCHAR, BOOLEAN, TIMESTAMPTZ vs TIMESTAMP, CHECK constraints, UNIQUE, NOT NULL, DEFAULT, NULL semantics.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| UUID default | `gen_random_uuid()` set as DEFAULT | UUID entered manually each insert |
| Duplicate email | Rejected by DB constraint | Allowed through |
| Age < 13 | Rejected by CHECK | Allowed through |
| NULL email | Rejected by NOT NULL | Allowed through |
| TIMESTAMPTZ used | Yes (timezone-aware) | TIMESTAMP (no timezone — wrong for production) |
| IS NULL vs = NULL | Knows `= NULL` doesn't work in SQL | Uses `= NULL` and gets confused |

**Stretch goals:**
- Add a constraint that `username` must be at least 3 characters: `CHECK (char_length(username) >= 3)`
- Add a named constraint: `CONSTRAINT valid_age CHECK (age >= 13 AND age <= 120)` — understand why naming constraints helps error messages

---

### PG-E3 — Primary Keys, Foreign Keys & Referential Integrity

**Objective:** Understand how tables relate to each other and how foreign keys enforce those relationships so the database itself prevents orphaned data.

**What you'll build:** A `posts` table that references a `users` table, with foreign key constraints enforced.

**Tasks:**

1. Create a new database `relations_db`. Create a `users` table (id, email, name). Create a `posts` table: `id`, `title`, `body`, `user_id` (INTEGER REFERENCES users(id)), `created_at`.
2. Try to insert a post with a `user_id` that doesn't exist in users. Observe the foreign key violation error.
3. Insert 2 users and 3 posts each — total 6 posts.
4. Try to DELETE a user who has posts. What happens? This is called a **constraint violation** — the DB is protecting you from orphaned posts.
5. Add `ON DELETE CASCADE` to the foreign key: `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`. Now delete a user — all their posts are deleted automatically.
6. Add a separate test with `ON DELETE SET NULL` (nullable `user_id`) — deleting a user sets the post's `user_id` to NULL rather than deleting the post.
7. Write a comment in your notes: when would you use CASCADE vs SET NULL vs RESTRICT (the default)?

**Topics covered:** Primary/foreign key relationship, referential integrity, orphaned rows, ON DELETE CASCADE, ON DELETE SET NULL, ON DELETE RESTRICT.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Foreign key defined | Yes on `user_id` | No FK — just an integer column |
| Insert orphaned post | Rejected by DB | Allowed |
| Delete user with posts (RESTRICT) | Rejected by DB | Allowed, posts remain orphaned |
| ON DELETE CASCADE understood | Posts deleted with user | No understanding of CASCADE |
| Difference between CASCADE/SET NULL/RESTRICT | Can explain each | Can't distinguish |

**Stretch goals:**
- Add a `comments` table that references both `users` and `posts`. Practice the three-table relationship
- Add `ON UPDATE CASCADE` and observe what happens when you update a user's `id`

---

### PG-M1 — JOINs

**Objective:** Understand how to query across multiple related tables and know which type of JOIN to reach for in which situation.

**What you'll build:** A `store_db` with customers, orders, and products — then query it using every JOIN type.

**Tasks:**

1. Create `store_db`. Build three tables:
   - `customers`: id, name, email
   - `products`: id, name, price
   - `orders`: id, customer_id (FK), product_id (FK), quantity, ordered_at
2. Seed data: 4 customers, 5 products, 8 orders. Intentionally leave 1 customer with no orders and 1 product with no orders.
3. Write and run each of these, understanding what each returns:
   - `INNER JOIN` — customers who HAVE placed orders (excludes the customer with no orders)
   - `LEFT JOIN` — ALL customers, with their orders where they exist (NULL for the customer with no orders)
   - `LEFT JOIN ... WHERE orders.id IS NULL` — customers who have NEVER placed an order
   - A JOIN across all three tables: show order details with customer name and product name
4. Write a query that calculates total spend per customer: GROUP BY customer + SUM(price * quantity).
5. Write a query that finds the most ordered product by total quantity.
6. Write a comment in your notes: what is the difference between INNER JOIN and LEFT JOIN, and when does it matter?

**Topics covered:** INNER JOIN, LEFT JOIN, multi-table JOIN, aggregate with JOIN (SUM, COUNT, GROUP BY), finding rows with no match (IS NULL pattern).

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| INNER JOIN result | Excludes customer with no orders | Includes them |
| LEFT JOIN result | Includes all customers | Excludes some |
| IS NULL pattern | Works to find no-order customers | Doesn't know this pattern |
| Three-table JOIN | Works correctly | Produces duplicate rows (cartesian product) |
| Total spend per customer | Correct SUM with GROUP BY | Wrong totals or missing GROUP BY |
| Can explain when LEFT vs INNER | Yes | "I just tried both" |

**Stretch goals:**
- Add a `HAVING` clause: find customers who have spent more than $100 total
- Look up FULL OUTER JOIN and write one query using it — understand what it returns

---

### PG-M2 — Indexes & Query Performance

**Objective:** Understand how indexes speed up queries, how to identify slow queries, and when NOT to add an index.

**What you'll build:** A `analytics_db` with a large seeded dataset, then measure query speed before and after adding indexes.

**Tasks:**

1. Create `analytics_db`. Create an `events` table: `id` (SERIAL), `user_id` (INTEGER), `event_type` (VARCHAR(50)), `properties` (TEXT), `created_at` (TIMESTAMPTZ DEFAULT NOW()).
2. Seed the table with 100,000 rows using a `generate_series` query:
   ```sql
   INSERT INTO events (user_id, event_type, created_at)
   SELECT
     (random() * 1000)::INTEGER,
     (ARRAY['click','view','purchase','signup'])[floor(random()*4+1)],
     NOW() - (random() * INTERVAL '90 days')
   FROM generate_series(1, 100000);
   ```
3. Run `EXPLAIN ANALYZE SELECT * FROM events WHERE user_id = 42;` — read the output. Look for "Seq Scan" (full table scan). Note the execution time.
4. Add an index: `CREATE INDEX idx_events_user_id ON events(user_id);`. Run the same EXPLAIN ANALYZE again. Look for "Index Scan". Compare execution time.
5. Run `EXPLAIN ANALYZE SELECT * FROM events WHERE event_type = 'purchase' ORDER BY created_at DESC;`. Then add a composite index on `(event_type, created_at)` and re-run.
6. Write a comment explaining: what is a Seq Scan, what is an Index Scan, and why does adding an index on every column cause problems for INSERT/UPDATE performance?

**Topics covered:** EXPLAIN ANALYZE, Seq Scan vs Index Scan, CREATE INDEX, composite indexes, index trade-offs (read speed vs write overhead), cardinality.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| EXPLAIN ANALYZE read | Can find execution time and scan type | Output is confusing/ignored |
| Performance difference measured | Before/after timing noted | Just ran query, didn't compare |
| Seq Scan understood | Full table scan, slow on large tables | Not understood |
| Index Scan understood | Uses the index, fast | Not understood |
| Write overhead understood | Index slows INSERT/UPDATE | "More indexes = always better" |
| Composite index order | Understands column order matters | Random order |

**Stretch goals:**
- Create a partial index: `CREATE INDEX idx_purchases ON events(user_id) WHERE event_type = 'purchase';` — understand when this is better than a full index
- Look up `VACUUM ANALYZE` and understand why Postgres needs it to use statistics for query planning

---

### PG-M3 — Transactions & ACID

**Objective:** Understand why transactions exist, what ACID means in practice, and how to use them to keep your database consistent even when things go wrong mid-operation.

**What you'll build:** A `bank_db` that simulates money transfers — the classic transaction example because it makes the need for atomicity concrete and obvious.

**Tasks:**

1. Create `bank_db`. Create an `accounts` table: `id`, `owner_name`, `balance` (NUMERIC(10,2), CHECK balance >= 0). Seed 3 accounts with $1000 each.
2. Write a transfer without a transaction: deduct $200 from account A, add $200 to account B. Manually interrupt it (Ctrl+C) between the two statements. Observe that account A lost $200 but account B never received it. This is the problem transactions solve.
3. Write the same transfer wrapped in `BEGIN; ... COMMIT;`. Interrupt it again. Observe that neither statement persists (both rolled back).
4. Write a transfer that intentionally TRIGGERs a CHECK constraint failure (transfer more than the balance). Observe that `ROLLBACK` fires automatically, leaving both accounts unchanged.
5. Manually test `ROLLBACK`: open a transaction, make changes, then type `ROLLBACK` instead of `COMMIT`. Verify nothing changed.
6. Read about the four isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE). Write a comment explaining what a "dirty read" is and which isolation level prevents it. (You don't need to implement all four — just understand them.)

**Topics covered:** ACID (Atomicity, Consistency, Isolation, Durability), BEGIN/COMMIT/ROLLBACK, automatic rollback on constraint failure, isolation levels, dirty reads, why transactions matter for financial operations.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Transfer without transaction | Shows the money loss problem | Skipped this step |
| Transfer with transaction | Both succeed or both fail | One side can succeed alone |
| CHECK constraint + transaction | Auto-rollback fires | Constraint ignored |
| ROLLBACK demonstrated | Changes undone | Doesn't know how to rollback |
| Dirty read explained | Correct explanation | Confused with other concepts |
| ACID explained | Can define each letter | Memorized acronym, no substance |

**Stretch goals:**
- Simulate a concurrent transfer conflict using two `psql` windows open at the same time — see what happens when both try to transfer from the same account simultaneously
- Add a `transfer_log` table and insert a log entry inside the transaction — observe that the log row also rolls back if the transfer fails

---

### PG-H1 — Aggregates, Subqueries & CTEs

**Objective:** Move beyond simple CRUD into analytical SQL — the kind of queries that answer real business questions about your data.

**What you'll build:** A reporting layer on top of a `saas_db` (users, subscriptions, payments) using aggregates, subqueries, and Common Table Expressions.

**Tasks:**

1. Create `saas_db` with tables: `users` (id, email, created_at), `plans` (id, name, price_monthly), `subscriptions` (id, user_id, plan_id, started_at, ended_at nullable), `payments` (id, user_id, amount, paid_at, status).
2. Seed it: 50 users, 3 plans (Free/Pro/Enterprise), 40 subscriptions, 100 payments.
3. Write these queries:
   - Total revenue per month (GROUP BY month using `DATE_TRUNC('month', paid_at)`)
   - Count of active subscriptions per plan (WHERE ended_at IS NULL)
   - Average payment amount per user, only for users with more than 2 payments (use HAVING)
   - The top 5 highest-paying users of all time (SUM of payments, ORDER BY, LIMIT)
4. Write a subquery: find all users who have NEVER made a payment (NOT IN or NOT EXISTS pattern).
5. Rewrite the above as a CTE:
   ```sql
   WITH paying_users AS (
     SELECT DISTINCT user_id FROM payments
   )
   SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM paying_users);
   ```
6. Write a CTE that calculates monthly revenue, then a second CTE that calculates month-over-month growth percentage, chained together.
7. Write a comment: when is a CTE better than a subquery, and when does it make no difference?

**Topics covered:** DATE_TRUNC, GROUP BY, HAVING, SUM/COUNT/AVG/MAX/MIN, NOT IN / NOT EXISTS, CTEs (WITH clause), chained CTEs, analytical vs operational SQL.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| DATE_TRUNC for monthly grouping | Correct | Using raw timestamp in GROUP BY |
| HAVING vs WHERE | Knows the difference | Using WHERE on aggregate results |
| NOT IN subquery | Works correctly | Confused when NULLs are in the sublist |
| CTE syntax | Clean and readable | Subquery soup |
| Chained CTEs | Works | Doesn't know CTEs can reference each other |
| CTE vs subquery explanation | Accurate | "CTE is always better" |

**Stretch goals:**
- Add a window function: `ROW_NUMBER() OVER (PARTITION BY plan_id ORDER BY started_at)` — rank subscriptions per plan by start date
- Write a query that shows each user's payment alongside their running total spend

---

### PG-H2 — Schema Design

**Objective:** Design a normalized relational schema from scratch given real-world requirements — and understand the trade-offs between normalization and query complexity.

**What you'll build:** A complete database schema for a project management tool (think Linear or Jira). You'll design it on paper first, then implement it.

**Tasks:**

1. Design the schema for these requirements before writing any SQL:
   - Users can be members of multiple organizations
   - Organizations have projects
   - Projects have issues
   - Issues can be assigned to a user
   - Issues have a status (Todo, In Progress, Done, Cancelled) and a priority (Low, Medium, High, Urgent)
   - Issues can have labels (many-to-many — one issue can have many labels; one label can be on many issues)
   - Users can comment on issues
   - Every table must have `created_at` and `updated_at`
2. Write the schema as an ERD (Entity Relationship Diagram) on paper or a whiteboard before touching SQL. Identify every foreign key and every many-to-many join table.
3. Implement the full schema in SQL. Use ENUMs for status and priority.
4. Write queries for these scenarios:
   - All issues assigned to a specific user across all their organizations
   - All open issues (not Done/Cancelled) in a project, sorted by priority
   - All issues with a specific label
   - Comment count per issue for a given project
5. Identify which columns should be indexed. Add those indexes with an explanation of why each one helps.
6. Write a comment on: what is database normalization? What is 3NF? Where did you intentionally denormalize and why?

**Topics covered:** ERD design, many-to-many join tables, ENUM types, multi-table joins, schema normalization, 1NF/2NF/3NF (conceptual), strategic denormalization, designing for query patterns.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| ERD drawn before SQL | Yes | Jumped straight to SQL |
| Many-to-many (issues/labels) | Join table implemented | Two arrays in one column |
| ENUMs used for status/priority | Yes | Plain strings with no constraint |
| updated_at on every table | Yes | Missing on some tables |
| Indexes on foreign keys | Yes | No indexes, all Seq Scans |
| Normalization comment | Thoughtful | Missing or generic |
| Queries work correctly | All return correct results | Wrong results or errors |

**Stretch goals:**
- Add soft deletes: `deleted_at TIMESTAMPTZ` (nullable) on issues and comments. Update queries to filter `WHERE deleted_at IS NULL`
- Design and implement a simple activity log table that records every change to an issue (what changed, old value, new value, who changed it, when)

---

## PART 2 — Prisma

Now you switch to Node.js and TypeScript. Every concept in Part 1 maps directly to what Prisma does under the hood. You'll recognize everything.

---

### PR-E1 — Setup, Schema & First Migration

**Objective:** Understand the Prisma workflow — schema definition, migration, and client generation — and connect it to what you already know about SQL tables.

**What you'll build:** The same `library` system from PG-E1, but defined in `schema.prisma` and migrated through Prisma.

**Tasks:**

1. Create a new Node.js + TypeScript project. Install `prisma` and `@prisma/client`. Run `npx prisma init`.
2. Set `DATABASE_URL` in `.env` to a new database `library_prisma_db`.
3. Define this model in `schema.prisma`:
   ```prisma
   model Book {
     id            Int      @id @default(autoincrement())
     title         String
     author        String
     publishedYear Int?
     available     Boolean  @default(true)
     createdAt     DateTime @default(now())
   }
   ```
4. Run `npx prisma migrate dev --name init`. Open TablePlus and verify the `books` table was created with the correct columns.
5. Run `npx prisma studio` — browse the table visually.
6. Write a `seed.ts` script that uses `prisma.book.create()` to insert 5 books. Run it.
7. Map each Prisma schema keyword to its SQL equivalent — write this as comments in your `schema.prisma` file: what does `@id` become in SQL? What does `@default(autoincrement())` become? What does `?` on a field become?

**Topics covered:** Prisma schema syntax, datasource + generator blocks, field types (String, Int, Boolean, DateTime), `@id`, `@default`, optional fields (`?`), migrations, Prisma Studio, seeding.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Migration ran successfully | Yes, table exists in DB | Migration not run |
| Schema matches SQL equivalent | Can map each keyword | No understanding of what Prisma generates |
| Seed script works | 5 books in DB after running | Script errors |
| Prisma Studio opened | Browsed the data | Never opened it |
| SQL mapping comments | Written and accurate | Missing |
| DATABASE_URL in .env | Yes | Hardcoded in code |

**Stretch goals:**
- Add a `genre` field to the model and run a second migration. Observe the migration file Prisma generates in `prisma/migrations/`
- Read the generated SQL in the migration file and verify it matches what you'd write by hand

---

### PR-E2 — Full CRUD with Prisma Client

**Objective:** Master the Prisma Client methods you'll use in every real project — and understand how each one maps to SQL.

**What you'll build:** A set of standalone TypeScript scripts (one per operation) that cover every CRUD operation with multiple variations.

**Tasks:**

1. Write `create.ts`:
   - `prisma.book.create({ data: { ... } })` — create one book
   - `prisma.book.createMany({ data: [...] })` — create 5 books at once
2. Write `read.ts`:
   - `prisma.book.findUnique({ where: { id: 1 } })` — exact match by unique field
   - `prisma.book.findFirst({ where: { available: true } })` — first match
   - `prisma.book.findMany({ where: { available: true } })` — all matches
   - `prisma.book.findMany({ orderBy: { publishedYear: 'desc' } })` — sorted
   - `prisma.book.findMany({ take: 3, skip: 0 })` — paginated (first page)
   - `prisma.book.findMany({ take: 3, skip: 3 })` — paginated (second page)
   - `prisma.book.count({ where: { available: true } })` — count
3. Write `update.ts`:
   - `prisma.book.update({ where: { id: 1 }, data: { available: false } })` — update one
   - `prisma.book.updateMany({ where: { available: true }, data: { available: false } })` — update many
4. Write `delete.ts`:
   - `prisma.book.delete({ where: { id: 1 } })` — delete one
   - `prisma.book.deleteMany({ where: { available: false } })` — delete many
5. Write `upsert.ts` — `prisma.book.upsert()`: create if not exists, update if it does. Use `title` as the unique identifier.
6. For each operation, write the equivalent raw SQL as a comment above the Prisma call.

**Topics covered:** findUnique vs findFirst vs findMany, create vs createMany, update vs updateMany, delete vs deleteMany, upsert, pagination with skip/take, count, SQL equivalents.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| findUnique vs findFirst difference | Can explain | Used interchangeably |
| Pagination with skip/take | Correct formula | Off-by-one errors |
| updateMany vs update | Knows when to use each | Always uses update |
| SQL comments | Present and correct | Missing or wrong SQL |
| upsert works | Correctly creates or updates | Errors on duplicate |
| createMany used | Yes | Looping create() for bulk inserts |

**Stretch goals:**
- Add `select` to a `findMany` — only return `title` and `author`, not all fields. Compare with SQL's `SELECT title, author FROM books`
- Experiment with `prisma.book.findMany({ where: { publishedYear: { gte: 2000, lte: 2020 } } })` — Prisma's filter operators

---

### PR-E3 — Relations in Prisma Schema

**Objective:** Define one-to-many and many-to-many relationships in Prisma schema and understand how they map to the SQL foreign keys and join tables you built in Part 1.

**What you'll build:** A `blog_db` with Users, Posts, and Tags (many-to-many).

**Tasks:**

1. Define these models:
   ```prisma
   model User {
     id        Int      @id @default(autoincrement())
     email     String   @unique
     name      String
     posts     Post[]
     createdAt DateTime @default(now())
   }

   model Post {
     id        Int      @id @default(autoincrement())
     title     String
     body      String
     published Boolean  @default(false)
     authorId  Int
     author    User     @relation(fields: [authorId], references: [id])
     tags      Tag[]
     createdAt DateTime @default(now())
   }

   model Tag {
     id    Int    @id @default(autoincrement())
     name  String @unique
     posts Post[]
   }
   ```
2. Run migration. Open TablePlus and find the implicit join table Prisma created for `Post <-> Tag`. What is it named? What columns does it have?
3. Create a user with posts in one operation using nested writes:
   ```ts
   prisma.user.create({
     data: {
       email: 'dev@test.com',
       name: 'Dev',
       posts: { create: [{ title: 'First Post', body: '...' }] }
     }
   })
   ```
4. Add tags to an existing post using `connect`:
   ```ts
   prisma.post.update({
     where: { id: 1 },
     data: { tags: { connect: [{ id: 1 }, { id: 2 }] } }
   })
   ```
5. Query a user and include their posts: `prisma.user.findUnique({ where: { id: 1 }, include: { posts: true } })`.
6. Query a post and include its author AND its tags: nested `include`.
7. Write the raw SQL that Prisma is generating for the nested include query — use `npx prisma db execute` or check Prisma logs.

**Topics covered:** One-to-many relations (`Post[]` on User), many-to-many (`Tag[]` on Post), implicit vs explicit join tables, nested create, connect/disconnect, include, relation fields vs scalar fields.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Relation defined correctly | Both sides declared | One-sided relation (will error) |
| Implicit join table found | Yes, can see it in TablePlus | Didn't look |
| Nested create works | User + posts created together | Two separate create calls |
| connect works for many-to-many | Tags connected to post | Tags recreated every time |
| Nested include works | Author and tags in one query | N+1 queries (separate fetches in a loop) |
| SQL logged | Found the generated SQL | "I trust Prisma" |

**Stretch goals:**
- Switch from an implicit join table to an explicit one (add a `PostTag` model with extra fields like `addedAt`) — understand why you'd do this
- Add `onDelete: Cascade` to the Post relation on User: `@relation(fields: [authorId], references: [id], onDelete: Cascade)`

---

### PR-M1 — Filtering, Sorting & Pagination

**Objective:** Master Prisma's `where` clause filter operators and build a real pagination pattern that works in production.

**What you'll build:** A query layer for a `products_db` that supports filtering by multiple fields, sorting, and cursor-based pagination.

**Tasks:**

1. Create a `products_db`. Define a `Product` model: `id`, `name`, `price` (Float), `category` (String), `inStock` (Boolean), `rating` (Float), `createdAt`.
2. Seed with 50+ products across 4 categories with varied prices and ratings.
3. Implement and test each filter operator:
   - `equals`, `not` — exact match and negation
   - `gt`, `gte`, `lt`, `lte` — numeric comparisons (price range)
   - `contains`, `startsWith`, `endsWith` — string search (search by name)
   - `in`, `notIn` — filter by multiple values (multiple categories)
   - `AND`, `OR`, `NOT` — compound filters (in stock AND price < 50)
4. Implement offset pagination (page-based): `skip: (page - 1) * pageSize, take: pageSize`. Return total count alongside results.
5. Implement cursor-based pagination: `cursor: { id: lastSeenId }, take: pageSize, skip: 1`. Understand why cursor pagination is more stable than offset for large datasets.
6. Build a `searchProducts(filters)` function that accepts optional filter params and builds the `where` object dynamically.
7. Write a comment: what is the problem with offset pagination on a dataset that has frequent inserts?

**Topics covered:** Prisma filter operators, compound filters, offset vs cursor pagination, dynamic where building, search patterns.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| String search (contains) | Case-insensitive with `mode: 'insensitive'` | Case-sensitive only |
| Compound filter | AND/OR used correctly | Can only filter one field at a time |
| Offset pagination formula | `skip: (page - 1) * pageSize` | Off-by-one errors |
| Cursor pagination | Works and explained | Not implemented |
| Dynamic where object | Built conditionally | Static where with hardcoded values |
| Pagination problem explained | Correct (shifting rows on insert) | Missing |

**Stretch goals:**
- Add `orderBy` that supports multiple fields: `orderBy: [{ category: 'asc' }, { price: 'desc' }]`
- Add full-text search using Prisma's `search` mode (requires enabling the preview feature in schema.prisma)

---

### PR-M2 — Nested Reads, Nested Writes & Select

**Objective:** Write efficient queries that fetch exactly the data you need — no more, no less — using `include` and `select`, and learn to avoid the N+1 problem.

**What you'll build:** A query layer for the blog_db from PR-E3 with deeply nested reads and complex nested writes.

**Tasks:**

1. Use the `blog_db` from PR-E3.
2. **Nested writes** — implement these operations in TypeScript:
   - Create a post WITH tags in one operation (nested `create` and `connect`)
   - Update a post and replace all its tags using `set`: `{ tags: { set: [{ id: 1 }] } }` — this disconnects all existing tags and reconnects only the specified ones
   - Delete a user and cascade-delete their posts (configure `onDelete: Cascade`, then verify posts are gone)
3. **Select vs Include**:
   - Fetch all posts but only return `id`, `title`, `createdAt` (no body — too large). Use `select`.
   - Fetch a post and include its `author` (only their `name` and `email`, not all fields). Use nested `select` inside `include`.
   - Understand when `select` and `include` cannot be used together at the top level.
4. **N+1 problem**: write code that fetches all posts, then loops and fetches each post's author separately. Count the DB queries (enable Prisma query logging). Then rewrite it as a single `findMany` with `include: { author: true }`. Compare query counts.
5. Implement `_count`: fetch all users and include a count of their posts without fetching the posts themselves: `include: { _count: { select: { posts: true } } }`.

**Topics covered:** Nested create/connect/set, `select` vs `include`, nested select inside include, N+1 problem, query logging, `_count`.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Tag replacement with `set` | Correct | Manually disconnect/connect each tag |
| Select used for partial fields | Yes | Always fetching all fields |
| N+1 identified | Yes — can show the query count | "It works, who cares" |
| N+1 fixed | Single query with include | Still looping |
| _count used | Yes | Fetching all posts just to count them |
| Nested select inside include | Works | Doesn't know this is possible |

**Stretch goals:**
- Enable Prisma query logging in development: `new PrismaClient({ log: ['query'] })` — log every SQL query to the console and study what Prisma generates
- Use `prisma.post.findMany({ where: { author: { email: { contains: 'gmail' } } } })` — filter across relations

---

### PR-M3 — Migrations in Practice

**Objective:** Understand how to safely evolve your database schema over time using Prisma migrations — the workflow you'll follow every time you change a model.

**What you'll build:** A simulated schema evolution over 6 migrations on a live `product_db`, going from simple to complex.

**Tasks:**

1. Start with a basic `Product` model (id, name, price). Run migration: `--name initial`.
2. Add a `description` field (nullable). Run migration: `--name add-product-description`. Open the generated migration file and read the SQL.
3. Add a non-nullable field `category` WITH a default value: `category String @default("Uncategorized")`. Understand why you need a default — without it, the migration fails on a table with existing rows.
4. Rename `price` to `priceUsd`. This requires two migrations: first add `priceUsd`, copy data (`UPDATE products SET "priceUsd" = price`), then drop `price`. Understand why Prisma can't rename columns automatically without losing data.
5. Add a relation: create a `Category` model and link `Product` to it with a FK. Run migration. Understand the migration order (Category must exist before Product FK can reference it).
6. Practice the `--create-only` flag: `npx prisma migrate dev --create-only --name add-index`. Edit the generated file to add an index manually. Then run `npx prisma migrate deploy` to apply it.
7. Write a comment: what is the difference between `prisma migrate dev` and `prisma migrate deploy`? When do you use each?

**Topics covered:** Migration workflow, generated SQL files, nullable vs non-nullable additions, default values on existing tables, column renaming safely, relation migrations, `--create-only` flag, dev vs deploy commands.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Generated migration SQL read | Yes, understood it | Never opened the file |
| Non-nullable addition | Default value added | Migration fails on existing rows |
| Column rename | Two-step process | One-step rename (data loss) |
| --create-only understood | Can explain and use | Never used it |
| migrate dev vs deploy | Can explain the difference | Used interchangeably |
| Migration files committed to git | Yes | In .gitignore |

**Stretch goals:**
- Intentionally break a migration (remove a non-nullable column that has data) — observe what `prisma migrate dev` does and how to recover using `prisma migrate resolve`
- Write a seed script that runs after every migration in dev: add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to package.json

---

### PR-H1 — Prisma Transactions

**Objective:** Use Prisma's transaction API to guarantee that multiple DB operations either all succeed or all fail together — the Prisma equivalent of SQL's BEGIN/COMMIT/ROLLBACK.

**What you'll build:** A `wallet_db` that handles balance transfers using Prisma transactions, exactly mirroring the bank_db you built in PG-M3.

**Tasks:**

1. Create `wallet_db`. Define `User` and `Wallet` (id, userId, balance Decimal, currency String).
2. **Sequential transaction** — `prisma.$transaction([])`:
   ```ts
   await prisma.$transaction([
     prisma.wallet.update({ where: { id: fromId }, data: { balance: { decrement: amount } } }),
     prisma.wallet.update({ where: { id: toId }, data: { balance: { increment: amount } } }),
   ])
   ```
   Test that if the second operation fails, the first is rolled back.
3. **Interactive transaction** — `prisma.$transaction(async (tx) => { ... })`:
   ```ts
   await prisma.$transaction(async (tx) => {
     const from = await tx.wallet.findUnique({ where: { id: fromId } })
     if (from.balance < amount) throw new Error('Insufficient funds')
     await tx.wallet.update({ where: { id: fromId }, data: { balance: { decrement: amount } } })
     await tx.wallet.update({ where: { id: toId }, data: { balance: { increment: amount } } })
   })
   ```
   Understand when you need the interactive form vs sequential.
4. Implement a `transferFunds(fromId, toId, amount)` function that uses an interactive transaction and handles: insufficient funds, wallet not found, self-transfer attempt.
5. Add a `TransactionLog` model. Inside the transfer transaction, also insert a log entry. Verify the log also rolls back if the transfer fails.
6. Write a comment: what is the difference between sequential and interactive transactions? When do you need interactive?

**Topics covered:** `$transaction` sequential form, `$transaction` interactive form, rollback behavior, error-triggered rollback, nested operations in transactions, the `tx` client.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Sequential transaction | Works for simple cases | Using two separate updates |
| Interactive transaction | Used when conditional logic needed | Always using sequential |
| Rollback on error | Verified — balance unchanged | Never tested failure case |
| Insufficient funds check | Inside transaction | Outside transaction (race condition) |
| TransactionLog rolls back | Yes, atomic with transfer | Log persists even when transfer fails |
| Sequential vs interactive explained | Accurate | Can't distinguish |

**Stretch goals:**
- Add `maxWait` and `timeout` options to your interactive transaction — understand what they do: `prisma.$transaction(async (tx) => { ... }, { maxWait: 5000, timeout: 10000 })`
- Test concurrent transfers using `Promise.all` — observe if race conditions occur and how Prisma handles them

---

### PR-H2 — Raw SQL & Prisma Middleware

**Objective:** Know when to escape Prisma's abstraction and write raw SQL directly, and how to add cross-cutting behavior (logging, soft deletes, timestamps) using Prisma middleware.

**What you'll build:** A layer of middleware on the blog_db that auto-timestamps all updates and implements soft deletes using Prisma middleware, plus raw SQL for a query Prisma can't express.

**Tasks:**

1. **`$queryRaw`** — use it for a query Prisma's API can't express: a recursive CTE to build a comment thread tree (parent/child comments). Define `Comment` with `parentId` (self-referential). Use raw SQL:
   ```ts
   const tree = await prisma.$queryRaw`
     WITH RECURSIVE comment_tree AS (
       SELECT * FROM "Comment" WHERE id = ${rootId}
       UNION ALL
       SELECT c.* FROM "Comment" c
       JOIN comment_tree ct ON c."parentId" = ct.id
     )
     SELECT * FROM comment_tree;
   `
   ```
2. **Tagged template literals for safety**: understand why `prisma.$queryRaw` with a tagged template literal is safe from SQL injection but `prisma.$queryRawUnsafe` is not. Write one example showing the difference.
3. **Soft deletes with Prisma middleware**:
   ```ts
   prisma.$use(async (params, next) => {
     if (params.model === 'Post') {
       if (params.action === 'delete') {
         params.action = 'update'
         params.args.data = { deletedAt: new Date() }
       }
       if (params.action === 'findMany' && !params.args?.where?.deletedAt) {
         params.args = params.args ?? {}
         params.args.where = { ...params.args.where, deletedAt: null }
       }
     }
     return next(params)
   })
   ```
   Add `deletedAt DateTime?` to Post. Verify: `delete` now sets `deletedAt`, `findMany` automatically filters out soft-deleted rows.
4. **Auto-updated timestamps**: write middleware that sets `updatedAt = new Date()` on every `update` and `updateMany` action, so you don't have to include it manually every time.
5. Write a comment: what are two situations where `$queryRaw` is the right tool over Prisma's API?

**Topics covered:** `$queryRaw`, `$executeRaw`, tagged template safety vs `$queryRawUnsafe`, Prisma middleware (`$use`), soft deletes, auto-timestamp middleware, SQL injection prevention.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Raw query uses tagged template | Yes — injection safe | String concatenation used |
| `$queryRawUnsafe` danger understood | Can explain | "Both are the same" |
| Soft delete middleware | delete → update with deletedAt | Still doing hard deletes |
| findMany filters soft deletes | Automatically via middleware | Manual `WHERE deletedAt IS NULL` every time |
| Auto-timestamp middleware | Works on all update actions | Only on explicit `updatedAt` include |
| Two good raw SQL use cases | Named correctly | Generic answer |

**Stretch goals:**
- Add a query logging middleware that logs every Prisma action, the model, and execution time to the console
- Write a `$executeRaw` for a bulk update that Prisma's `updateMany` can't do (e.g. `UPDATE posts SET views = views + 1 WHERE id = ANY($1::int[])`)

---

## PART 3 — Combined

---

### CB-1 — Full API with PostgreSQL & Prisma (Capstone)

**Objective:** Build a complete, working REST API that uses everything from Part 1 and Part 2 together — schema design, migrations, relations, filtering, pagination, transactions, and at least one raw SQL query.

**What you'll build:** A task management API. Think a minimal Trello: Workspaces, Boards, Lists, Cards. Real enough to exercise every concept.

**Tasks:**

1. **Design first** — write the schema on paper before touching code:
   - `User`: id, email, name, createdAt
   - `Workspace`: id, name, ownerId (FK to User), members (many-to-many with User)
   - `Board`: id, name, workspaceId (FK), createdAt
   - `List`: id, name, boardId (FK), position (Integer — for ordering)
   - `Card`: id, title, description (nullable), listId (FK), assigneeId (nullable FK to User), dueDate (nullable), completedAt (nullable), position (Integer), createdAt
   - `Label`: id, name, color, workspaceId (FK)
   - `CardLabel`: join table for Card <-> Label

2. Implement the Prisma schema and migrate.

3. Build these API endpoints:
   - `POST /workspaces` — create workspace, auto-add creator as member
   - `GET /workspaces/:id/boards` — all boards in a workspace (with list count per board using `_count`)
   - `POST /boards/:id/lists` — add list to board
   - `GET /boards/:id` — full board with lists and cards, ordered by position
   - `POST /lists/:id/cards` — add card to list
   - `PATCH /cards/:id/move` — move a card to a different list (update listId and position in a transaction)
   - `GET /cards?assignee=:userId&due=overdue` — filtered cards query (overdue = dueDate < now AND completedAt IS NULL)
   - `GET /workspaces/:id/stats` — use `$queryRaw` for: total cards, completed cards, overdue cards, completion rate. This is the one query Prisma's API makes awkward.

4. Implement `position` reordering: when a card is moved, update the positions of all affected cards in a single transaction.

5. Add soft deletes (via middleware) on `Card` and `Board`.

6. Write `AUTH.md`-equivalent documentation: `DB.md` — explain the schema, the key design decisions, and what you'd change if the app needed to scale to 100k users.

**Topics covered:** Full schema design, all relation types, nested reads with `_count`, filtering across relations, transactions for multi-row updates, `$queryRaw` for analytics, soft delete middleware, documentation.

**Review Criteria:**

| Criteria | Pass | Fail |
|----------|------|------|
| Schema designed before coding | ADR or notes exist | Jumped to code |
| All relations correct | One-to-many and many-to-many work | Relations broken or missing |
| _count used for board stats | Yes | Fetching all lists to count them |
| Card move is transactional | Position updates atomic | Two separate updates (race condition) |
| $queryRaw for stats | Used for the stats endpoint | Prisma API used and it's awkward |
| Soft delete middleware active | Cards aren't hard deleted | Hard deletes only |
| DB.md written | Present and thoughtful | Missing |

**Stretch goals:**
- Add full-text search on card title and description using PostgreSQL's `tsvector` and `tsquery` — expose it via `GET /cards?search=keyword`
- Write a database backup script that exports the entire database to a JSON file and can re-import it — useful for understanding the data structure at a meta level

---

## Review Checklist (Universal — Apply to Every Assignment)

- [ ] Can you explain every line you wrote? If not, stop and understand it before moving on.
- [ ] Open TablePlus after every migration — verify the table looks exactly like you expected.
- [ ] Log Prisma queries in dev (`log: ['query']`) at least once per assignment — read what SQL is being generated.
- [ ] Every operation that can fail is wrapped in try/catch.
- [ ] No credentials or DATABASE_URL hardcoded in any `.ts` file.
- [ ] Write the SQL equivalent of every Prisma call at least until PR-M1 — after that you should be able to do it mentally.

---

## Suggested Order

```
PG-E1 → PG-E2 → PG-E3 → PG-M1 → PG-M2 → PG-M3 → PG-H1 → PG-H2
→ PR-E1 → PR-E2 → PR-E3 → PR-M1 → PR-M2 → PR-M3 → PR-H1 → PR-H2
→ CB-1
→ Auth Assignments
```

Do not skip PG-H2 (Schema Design). That assignment directly prepares you for designing the auth schema in the auth assignments.

---

## Concepts Map

```
PART 1 — PostgreSQL
├── Easy
│   ├── PG-E1: CLI, first DB, basic CRUD
│   ├── PG-E2: Data types & constraints
│   └── PG-E3: Primary keys, foreign keys, referential integrity
├── Medium
│   ├── PG-M1: JOINs (INNER, LEFT, multi-table)
│   ├── PG-M2: Indexes & EXPLAIN ANALYZE
│   └── PG-M3: Transactions & ACID
└── Hard
    ├── PG-H1: Aggregates, subqueries, CTEs
    └── PG-H2: Schema design from scratch

PART 2 — Prisma
├── Easy
│   ├── PR-E1: Setup, schema, first migration
│   ├── PR-E2: Full CRUD with Prisma Client
│   └── PR-E3: Relations in schema
├── Medium
│   ├── PR-M1: Filtering, sorting, pagination
│   ├── PR-M2: Nested reads, writes, N+1
│   └── PR-M3: Migration workflow in practice
└── Hard
    ├── PR-H1: Prisma transactions
    └── PR-H2: Raw SQL & middleware

PART 3 — Combined
└── CB-1: Full task management API (capstone)

→ Auth Assignments (next track)
```
