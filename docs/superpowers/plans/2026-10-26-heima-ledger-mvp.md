# 黑马记账 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Windows/macOS desktop expense tracker with two-level categories, monthly review, statistics, CSV export, and validated backup/restore.

**Architecture:** React and TypeScript render a single-window interface, while Tauri commands delegate all financial rules and SQLite access to Rust services. The database stores money as integer cents and dates as `YYYY-MM-DD`; a per-command connection plus a process-level mutex protects backup and restore operations.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, Vite, Vitest, React Testing Library, SQLite via `rusqlite`, `tauri-plugin-dialog`, `tauri-plugin-opener`.

**Spec:** `README.md`

## Global Constraints

- Support 64-bit Windows 10/11 and macOS 12 or later on Apple Silicon and Intel Macs.
- The first release runs entirely offline and performs no business network requests.
- All money values are RMB and are stored and calculated as integer cents.
- Single-expense accepted range is `1..=9_999_999_999` cents.
- Every expense references one active second-level category; category depth is exactly two.
- Expense dates are stored as `YYYY-MM-DD`; monthly statistics use the expense date.
- Notes contain at most 200 Unicode characters.
- Category names contain 1 to 20 Unicode characters.
- Automatic backups retain the latest 30 daily backup files.
- The first release excludes income, budgets, accounts, cloud sync, mobile, attachments, app passwords, dark mode, and auto-update.
- User-facing text is Simplified Chinese.
- All destructive actions require explicit confirmation.
- Finish each task with its tests passing before moving to the next task.

## Scope Check

This is one cohesive MVP: every subsystem supports the same expense ledger. It does not require multiple independent plans. The tasks below produce a working foundation, then records, then review features, then reliability and release checks.

## File Structure

```text
.
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── main.tsx
│   ├── styles/global.css
│   ├── types/domain.ts
│   ├── lib/api.ts
│   ├── lib/date.ts
│   ├── lib/date.test.ts
│   ├── lib/money.ts
│   ├── lib/money.test.ts
│   ├── components/AppShell.tsx
│   ├── components/FeedbackBanner.tsx
│   ├── components/ConfirmDialog.tsx
│   ├── components/MoneyInput.tsx
│   ├── components/CategoryPicker.tsx
│   ├── components/ExpenseDrawer.tsx
│   ├── pages/OverviewPage.tsx
│   ├── pages/ExpensesPage.tsx
│   ├── pages/StatsPage.tsx
│   ├── pages/SettingsPage.tsx
│   ├── features/categories/CategoryManager.tsx
│   ├── features/expenses/ExpenseTable.tsx
│   ├── features/expenses/ExpenseFilters.tsx
│   └── test/setup.ts
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/
    ├── src/
    │   ├── main.rs
    │   ├── lib.rs
    │   ├── app_state.rs
    │   ├── commands.rs
    │   ├── error.rs
    │   ├── models.rs
    │   ├── db/
    │   │   ├── mod.rs
    │   │   ├── schema.rs
    │   │   └── seed.rs
    │   └── services/
    │       ├── mod.rs
    │       ├── categories.rs
    │       ├── expenses.rs
    │       ├── stats.rs
    │       ├── backups.rs
    │       └── csv_export.rs
    └── tests/
        ├── database.rs
        ├── commands.rs
        ├── categories.rs
        ├── expenses.rs
        ├── stats.rs
        ├── backups.rs
        └── performance.rs
```

Files are deliberately grouped by product responsibility. The Rust services own validation and persistence; React components only translate user actions into command calls.

---

### Task 1: Bootstrap the desktop shell and test harness

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/test/setup.ts`
- Create: `src/styles/global.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/icons/app-icon.svg`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: Node.js and Git already installed on this computer.
- Produces: `npm run dev`, `npm test`, `npm run tauri dev`, and `cargo test --manifest-path src-tauri/Cargo.toml` as working project commands.

- [ ] **Step 1: Install and verify the Tauri Windows prerequisites**

Run in PowerShell:

```powershell
winget install --id Rustlang.Rustup -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install --id Microsoft.EdgeWebView2Runtime -e
```

Open a new PowerShell process and verify:

```powershell
rustc --version
cargo --version
node --version
git --version
```

Expected: all four commands print version numbers. If a `winget` package is already installed, `winget` reports that and leaves the existing installation intact.

- [ ] **Step 2: Initialize version control and ignore generated files**

Run:

```powershell
git init
```

Create `.gitignore` with:

```gitignore
node_modules/
dist/
.vite/
coverage/
src-tauri/target/
src-tauri/gen/
*.log
.DS_Store
Thumbs.db
```

Create `package.json` with:

```json
{
  "name": "heima-ledger",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-opener": "^2.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^26.0.0",
    "typescript": "~5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

Run:

```powershell
npm install
```

Expected: `package-lock.json` is created and npm exits successfully.

- [ ] **Step 3: Write the failing application shell test**

Create `src/App.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders the product and primary navigation", () => {
    render(<App />);

    expect(screen.getByText("黑马记账")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "总览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "支出明细" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "分类统计" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
  });
});
```

Create `src/test/setup.ts` with:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Run the test to verify it fails**

Run:

```powershell
npx vitest run src/App.test.tsx
```

Expected: FAIL because `src/App.tsx` does not yet provide the application shell.

- [ ] **Step 5: Implement the minimal React and Tauri shell**

Create `vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
```

Add `@vitejs/plugin-react` to `devDependencies` and run `npm install`.

Create `vitest.config.ts` with:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
  },
});
```

Create `src/main.tsx` with:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx` with:

```tsx
const navigation = ["总览", "支出明细", "分类统计", "设置"] as const;

export default function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">黑马记账</div>
        <nav aria-label="主导航">
          {navigation.map((label) => (
            <button key={label} type="button">
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="content">
        <h1>总览</h1>
      </section>
    </main>
  );
}
```

Create `src/styles/global.css` with:

```css
:root {
  font-family: "Microsoft YaHei UI", "PingFang SC", sans-serif;
  color: #1f2328;
  background: #f7f5ef;
  font-synthesis: none;
  --ink: #171a1f;
  --gold: #d9992a;
  --paper: #f7f5ef;
  --surface: #fffefa;
  --danger: #b93838;
  --border: #ded8cc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 860px;
  min-height: 600px;
  background: var(--paper);
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  display: grid;
  grid-template-columns: 208px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--ink);
  color: white;
  padding: 24px 16px;
}

.brand {
  color: var(--gold);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 28px;
}

.sidebar nav {
  display: grid;
  gap: 8px;
}

.sidebar button {
  color: #f8f4e8;
  background: transparent;
  border: 0;
  border-radius: 10px;
  padding: 11px 12px;
  text-align: left;
  cursor: pointer;
}

.sidebar button:hover,
.sidebar button:focus-visible {
  background: #2a3038;
  outline: 2px solid var(--gold);
}

.content {
  padding: 32px;
}
```

Create `index.html`, `tsconfig.json`, and `tsconfig.node.json` using the standard Vite React TypeScript settings:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>黑马记账</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

Create `src-tauri/Cargo.toml` with:

```toml
[package]
name = "heima-ledger"
version = "0.1.0"
description = "黑马记账"
authors = ["Heima Ledger"]
edition = "2021"

[lib]
name = "heima_ledger_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.37", features = ["bundled", "backup"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }
thiserror = "2"
csv = "1"
tempfile = "3"
```

Create `src-tauri/build.rs` with:

```rust
fn main() {
    tauri_build::build()
}
```

Create `src-tauri/tauri.conf.json` with:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "黑马记账",
  "version": "0.1.0",
  "identifier": "com.heima.ledger",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "黑马记账",
        "width": 1100,
        "height": 720,
        "minWidth": 860,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": "default-src 'self' customprotocol: asset:; connect-src ipc: http://ipc.localhost ws://localhost:1420; style-src 'self' 'unsafe-inline'; img-src 'self' asset: http://asset.localhost blob: data:"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

Create `src-tauri/capabilities/default.json` with:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "opener:allow-open-path"
  ]
}
```

Create `src-tauri/src/lib.rs` with:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("failed to run 黑马记账");
}
```

Create `src-tauri/src/main.rs` with:

```rust
fn main() {
    heima_ledger_lib::run();
}
```

Create `src-tauri/icons/app-icon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#171a1f"/>
  <path d="M124 340V172h54v52h156v-52h54v168h-54v-62H178v62z" fill="#d9992a"/>
  <path d="M226 74l30 72 30-72" fill="none" stroke="#f7f5ef" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Generate the platform icon files:

```powershell
npx tauri icon src-tauri/icons/app-icon.svg
```

Expected: `icon.ico`, `icon.icns`, and the configured PNG files exist under `src-tauri/icons/`.

- [ ] **Step 6: Verify the shell in tests and the desktop window**

Run:

```powershell
npx vitest run src/App.test.tsx
npm run tauri dev
```

Expected: the test passes, and a desktop window named “黑马记账” opens with four navigation buttons.

- [ ] **Step 7: Commit the working shell**

Run:

```powershell
git add .gitignore package.json package-lock.json index.html tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts src src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/build.rs src-tauri/tauri.conf.json src-tauri/capabilities src-tauri/icons src-tauri/src
git commit -m "chore: bootstrap Tauri desktop shell"
```

Expected: Git creates the first implementation commit.

---

### Task 2: Add the SQLite schema and seeded two-level categories

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/error.rs`
- Create: `src-tauri/src/db/mod.rs`
- Create: `src-tauri/src/db/schema.rs`
- Create: `src-tauri/src/db/seed.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/database.rs`

**Interfaces:**
- Consumes: the Tauri crate from Task 1.
- Produces: `heima_ledger_lib::db::{open_database, open_in_memory}`, both returning `Result<rusqlite::Connection, AppError>`.
- Produces: table schema with `category`, `expense`, `settings`, and `schema_version`.
- Produces: `AppError::{validation, conflict, not_found, storage}`.

- [ ] **Step 1: Write the failing schema and seed tests**

Create `src-tauri/tests/database.rs` with:

```rust
use heima_ledger_lib::db::open_in_memory;

#[test]
fn migrates_and_seeds_the_confirmed_category_tree() {
    let conn = open_in_memory().expect("database opens");

    let schema_version: i64 = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |row| row.get(0))
        .expect("schema version exists");
    let category_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM category", [], |row| row.get(0))
        .expect("category rows exist");
    let parent_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM category WHERE parent_id IS NULL",
            [],
            |row| row.get(0),
        )
        .expect("parent rows exist");

    assert_eq!(schema_version, 1);
    assert_eq!(category_count, 79);
    assert_eq!(parent_count, 13);
    assert_eq!(category_count - parent_count, 66);
}

#[test]
fn seeded_children_all_point_to_level_one_categories() {
    let conn = open_in_memory().expect("database opens");
    let invalid_count: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM category child
             LEFT JOIN category parent ON parent.id = child.parent_id
             WHERE child.parent_id IS NOT NULL
               AND (parent.id IS NULL OR parent.parent_id IS NOT NULL)",
            [],
            |row| row.get(0),
        )
        .expect("category join succeeds");

    assert_eq!(invalid_count, 0);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test database
```

Expected: compile failure because the database module and model files do not exist.

- [ ] **Step 3: Implement error and DTO foundations**

Create `src-tauri/src/error.rs` with:

```rust
use serde::Serialize;
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
}

impl AppError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            code: "VALIDATION".into(),
            message: message.into(),
        }
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self {
            code: "CONFLICT".into(),
            message: message.into(),
        }
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            code: "NOT_FOUND".into(),
            message: message.into(),
        }
    }

    pub fn storage(error: impl Display) -> Self {
        Self {
            code: "STORAGE".into(),
            message: format!("本地数据操作失败：{error}"),
        }
    }
}

impl Display for AppError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for AppError {}

impl From<rusqlite::Error> for AppError {
    fn from(value: rusqlite::Error) -> Self {
        Self::storage(value)
    }
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::storage(value)
    }
}

impl From<csv::Error> for AppError {
    fn from(value: csv::Error) -> Self {
        Self::storage(value)
    }
}
```

Create `src-tauri/src/models.rs` with the complete shared DTO vocabulary:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort_order: i64,
    pub active: bool,
    pub built_in: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseDraft {
    pub amount_cents: i64,
    pub spent_on: String,
    pub category_id: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Expense {
    pub id: String,
    pub amount_cents: i64,
    pub spent_on: String,
    pub category_id: String,
    pub category_name: String,
    pub parent_category_id: String,
    pub parent_category_name: String,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseFilter {
    pub month: String,
    pub parent_category_id: Option<String>,
    pub category_id: Option<String>,
    pub keyword: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryTotal {
    pub category_id: String,
    pub category_name: String,
    pub amount_cents: i64,
    pub children: Vec<CategoryTotal>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthSummary {
    pub month: String,
    pub total_cents: i64,
    pub categories: Vec<CategoryTotal>,
}
```

- [ ] **Step 4: Implement migrations, connections, and the full seed**

Create `src-tauri/src/db/schema.rs` with:

```rust
use crate::error::AppError;
use chrono::{SecondsFormat, Utc};
use rusqlite::Connection;

pub fn apply(conn: &mut Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS category (
            id TEXT PRIMARY KEY,
            parent_id TEXT REFERENCES category(id),
            name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 20),
            sort_order INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
            built_in INTEGER NOT NULL DEFAULT 0 CHECK(built_in IN (0, 1)),
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_category_parent
            ON category(parent_id, sort_order);

        CREATE TABLE IF NOT EXISTS expense (
            id TEXT PRIMARY KEY,
            amount_cents INTEGER NOT NULL
                CHECK(amount_cents BETWEEN 1 AND 9999999999),
            spent_on TEXT NOT NULL,
            category_id TEXT NOT NULL REFERENCES category(id),
            note TEXT CHECK(note IS NULL OR length(note) <= 200),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_expense_spent_on
            ON expense(spent_on);
        CREATE INDEX IF NOT EXISTS idx_expense_category
            ON expense(category_id);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        PRAGMA foreign_keys = ON;",
    )?;

    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    conn.execute(
        "INSERT OR IGNORE INTO schema_version(version, applied_at) VALUES (1, ?1)",
        [now],
    )?;
    Ok(())
}
```

Create `src-tauri/src/db/seed.rs` with:

```rust
use crate::error::AppError;
use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection};

const CATEGORIES: &[(&str, Option<&str>, &str, i64)] = &[
    ("food", None, "餐饮美食", 10),
    ("shopping", None, "日常购物", 20),
    ("transport", None, "交通出行", 30),
    ("housing", None, "住居生活", 40),
    ("communications", None, "通讯网络", 50),
    ("health", None, "医疗健康", 60),
    ("leisure", None, "休闲娱乐", 70),
    ("education", None, "学习教育", 80),
    ("social", None, "人情社交", 90),
    ("childcare", None, "家庭育儿", 100),
    ("pets", None, "宠物", 110),
    ("finance", None, "金融保险", 120),
    ("other", None, "其他支出", 130),
    ("food-breakfast", Some("food"), "早餐", 10),
    ("food-meals", Some("food"), "正餐", 20),
    ("food-late-night", Some("food"), "夜宵", 30),
    ("food-cafe", Some("food"), "咖啡茶饮", 40),
    ("food-snacks", Some("food"), "零食水果", 50),
    ("food-groceries", Some("food"), "食材采购", 60),
    ("food-alcohol", Some("food"), "酒水", 70),
    ("shopping-daily", Some("shopping"), "日用百货", 10),
    ("shopping-clothing", Some("shopping"), "服饰鞋包", 20),
    ("shopping-beauty", Some("shopping"), "美妆个护", 30),
    ("shopping-home", Some("shopping"), "家居用品", 40),
    ("shopping-digital", Some("shopping"), "数码产品", 50),
    ("shopping-other", Some("shopping"), "其他购物", 60),
    ("transport-public", Some("transport"), "公共交通", 10),
    ("transport-ride", Some("transport"), "打车网约车", 20),
    ("transport-fuel", Some("transport"), "加油充电", 30),
    ("transport-parking", Some("transport"), "停车过路", 40),
    ("transport-long-distance", Some("transport"), "火车飞机", 50),
    ("transport-maintenance", Some("transport"), "车辆养护", 60),
    ("housing-rent", Some("housing"), "房租房贷", 10),
    ("housing-property", Some("housing"), "物业费", 20),
    ("housing-utilities", Some("housing"), "水电燃气", 30),
    ("housing-repair", Some("housing"), "家居维修", 40),
    ("housing-cleaning", Some("housing"), "家政服务", 50),
    ("communications-mobile", Some("communications"), "手机话费", 10),
    ("communications-broadband", Some("communications"), "宽带网络", 20),
    ("communications-digital", Some("communications"), "数码服务", 30),
    ("communications-software", Some("communications"), "软件订阅", 40),
    ("health-clinic", Some("health"), "门诊药品", 10),
    ("health-treatment", Some("health"), "检查治疗", 20),
    ("health-dental", Some("health"), "牙科", 30),
    ("health-checkup", Some("health"), "体检", 40),
    ("health-fitness", Some("health"), "健身运动", 50),
    ("leisure-cinema", Some("leisure"), "电影演出", 10),
    ("leisure-games", Some("leisure"), "游戏充值", 20),
    ("leisure-travel", Some("leisure"), "旅行度假", 30),
    ("leisure-gathering", Some("leisure"), "聚会活动", 40),
    ("leisure-media", Some("leisure"), "书报影音", 50),
    ("education-course", Some("education"), "课程培训", 10),
    ("education-exam", Some("education"), "考试报名", 20),
    ("education-books", Some("education"), "书籍资料", 30),
    ("education-tools", Some("education"), "学习工具", 40),
    ("education-other", Some("education"), "其他学习", 50),
    ("social-cash-gift", Some("social"), "红包礼金", 10),
    ("social-present", Some("social"), "赠送礼品", 20),
    ("social-treat", Some("social"), "请客聚餐", 30),
    ("social-charity", Some("social"), "慈善捐赠", 40),
    ("social-other", Some("social"), "其他往来", 50),
    ("childcare-formula", Some("childcare"), "奶粉辅食", 10),
    ("childcare-supplies", Some("childcare"), "儿童用品", 20),
    ("childcare-education", Some("childcare"), "教育托育", 30),
    ("childcare-medical", Some("childcare"), "儿童医疗", 40),
    ("childcare-toys", Some("childcare"), "玩具图书", 50),
    ("pets-food", Some("pets"), "宠物食品", 10),
    ("pets-medical", Some("pets"), "宠物医疗", 20),
    ("pets-supplies", Some("pets"), "宠物用品", 30),
    ("pets-grooming", Some("pets"), "美容寄养", 40),
    ("pets-other", Some("pets"), "其他宠物", 50),
    ("finance-insurance", Some("finance"), "保险费用", 10),
    ("finance-bank-fee", Some("finance"), "银行手续费", 20),
    ("finance-interest", Some("finance"), "贷款利息", 30),
    ("finance-tax", Some("finance"), "税费", 40),
    ("other-uncategorized", Some("other"), "未分类", 10),
    ("other-accident", Some("other"), "意外支出", 20),
    ("other-fine", Some("other"), "罚款", 30),
    ("other-other", Some("other"), "其他", 40),
];

pub fn insert(conn: &Connection) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    for (id, parent_id, name, sort_order) in CATEGORIES {
        conn.execute(
            "INSERT OR IGNORE INTO category
             (id, parent_id, name, sort_order, active, built_in, created_at)
             VALUES (?1, ?2, ?3, ?4, 1, 1, ?5)",
            params![id, parent_id, name, sort_order, now],
        )?;
    }
    Ok(())
}
```

Create `src-tauri/src/db/mod.rs` with:

```rust
pub mod schema;
pub mod seed;

use crate::error::AppError;
use rusqlite::Connection;
use std::path::Path;

fn configure(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")?;
    Ok(())
}

pub fn migrate(conn: &mut Connection) -> Result<(), AppError> {
    configure(conn)?;
    schema::apply(conn)?;
    seed::insert(conn)?;
    Ok(())
}

pub fn open_in_memory() -> Result<Connection, AppError> {
    let mut conn = Connection::open_in_memory()?;
    migrate(&mut conn)?;
    Ok(conn)
}

pub fn open_database(path: &Path) -> Result<Connection, AppError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut conn = Connection::open(path)?;
    configure(&conn)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    migrate(&mut conn)?;
    Ok(conn)
}
```

Modify `src-tauri/src/lib.rs` to export the modules:

```rust
pub mod db;
pub mod error;
pub mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("failed to run 黑马记账");
}
```

- [ ] **Step 5: Run schema tests and verify database creation**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test database
```

Expected: both tests pass; the seeded database contains 13 level-one categories and 66 level-two categories.

- [ ] **Step 6: Commit the database foundation**

Run:

```powershell
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/models.rs src-tauri/src/error.rs src-tauri/src/db src-tauri/src/lib.rs src-tauri/tests/database.rs
git commit -m "feat: add ledger database and category seed"
```

Expected: the database foundation is committed.

---

### Task 3: Implement category management services

**Files:**
- Create: `src-tauri/src/services/mod.rs`
- Create: `src-tauri/src/services/categories.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/categories.rs`

**Interfaces:**
- Consumes: `Category`, `AppError`, `open_in_memory`.
- Produces: `list_categories(&Connection) -> Result<Vec<Category>, AppError>`.
- Produces: `create_category(&mut Connection, Option<&str>, &str) -> Result<Category, AppError>`.
- Produces: `rename_category(&Connection, &str, &str) -> Result<Category, AppError>`.
- Produces: `set_category_active(&Connection, &str, bool) -> Result<Category, AppError>`.
- Produces: `move_category(&Connection, &str, &str) -> Result<Category, AppError>`.

- [ ] **Step 1: Write failing category service tests**

Create `src-tauri/tests/categories.rs` with:

```rust
use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::services::categories::{
    create_category, list_categories, move_category, rename_category, set_category_active,
};

fn custom_category(conn: &mut rusqlite::Connection) -> String {
    create_category(conn, Some("food"), "工作午餐")
        .expect("category is created")
        .id
}

#[test]
fn creates_a_second_level_category_under_an_existing_parent() {
    let mut conn = open_in_memory().unwrap();
    let category = create_category(&mut conn, Some("food"), "工作午餐").unwrap();

    assert_eq!(category.parent_id.as_deref(), Some("food"));
    assert!(category.active);
    assert!(!category.built_in);
}

#[test]
fn rejects_duplicates_blank_names_and_third_levels() {
    let mut conn = open_in_memory().unwrap();
    create_category(&mut conn, Some("food"), "工作午餐").unwrap();
    let first = list_categories(&conn)
        .unwrap()
        .into_iter()
        .find(|item| item.name == "工作午餐")
        .unwrap();

    assert_eq!(
        create_category(&mut conn, Some("food"), "工作午餐")
            .unwrap_err()
            .code,
        "CONFLICT"
    );
    assert_eq!(
        create_category(&mut conn, Some("food"), "  ")
            .unwrap_err()
            .code,
        "VALIDATION"
    );
    assert_eq!(
        create_category(&mut conn, Some(&first.id), "更细一级")
            .unwrap_err()
            .code,
        "VALIDATION"
    );
}

#[test]
fn prevents_deactivating_a_parent_with_active_children() {
    let conn = open_in_memory().unwrap();
    let error = set_category_active(&conn, "food", false).unwrap_err();
    assert_eq!(error.code, "CONFLICT");
}

#[test]
fn renames_and_moves_an_unused_category() {
    let mut conn = open_in_memory().unwrap();
    let id = custom_category(&mut conn);
    let renamed = rename_category(&conn, &id, "客户午餐").unwrap();
    let moved = move_category(&conn, &id, "social").unwrap();

    assert_eq!(renamed.name, "客户午餐");
    assert_eq!(moved.parent_id.as_deref(), Some("social"));
}

#[test]
fn keeps_the_seeded_parent_order_in_the_category_list() {
    let conn = open_in_memory().unwrap();
    let roots: Vec<String> = list_categories(&conn)
        .unwrap()
        .into_iter()
        .filter(|item| item.parent_id.is_none())
        .map(|item| item.name)
        .collect();

    assert_eq!(roots.first().map(String::as_str), Some("餐饮美食"));
    assert_eq!(roots.last().map(String::as_str), Some("其他支出"));
}

#[test]
fn rejects_active_children_under_an_inactive_parent() {
    let mut conn = open_in_memory().unwrap();
    let parent = create_category(&mut conn, None, "临时大类").unwrap();
    set_category_active(&conn, &parent.id, false).unwrap();
    let error = create_category(&mut conn, Some(&parent.id), "临时小类").unwrap_err();

    assert_eq!(error.code, "VALIDATION");
}

#[test]
fn refuses_to_move_a_category_that_is_already_used() {
    use heima_ledger_lib::models::ExpenseDraft;
    use heima_ledger_lib::services::expenses::create_expense;

    let mut conn = open_in_memory().unwrap();
    let id = custom_category(&mut conn);
    create_expense(
        &mut conn,
        ExpenseDraft {
            amount_cents: 1200,
            spent_on: "2026-10-26".into(),
            category_id: id.clone(),
            note: None,
        },
    )
    .unwrap();
    let error = move_category(&conn, &id, "social").unwrap_err();

    assert_eq!(error.code, "CONFLICT");
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test categories
```

Expected: compile failure because `services::categories` does not exist.

- [ ] **Step 3: Implement the category service**

Create `src-tauri/src/services/mod.rs` with:

```rust
pub mod categories;
```

Create `src-tauri/src/services/categories.rs` with:

```rust
use crate::error::AppError;
use crate::models::Category;
use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

fn validate_name(name: &str) -> Result<String, AppError> {
    let trimmed = name.trim();
    let length = trimmed.chars().count();
    if !(1..=20).contains(&length) {
        return Err(AppError::validation("分类名称需要 1 到 20 个字符"));
    }
    Ok(trimmed.to_string())
}

fn read_category(conn: &Connection, id: &str) -> Result<Category, AppError> {
    conn.query_row(
        "SELECT id, parent_id, name, sort_order, active, built_in
         FROM category WHERE id = ?1",
        [id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
                active: row.get::<_, i64>(4)? == 1,
                built_in: row.get::<_, i64>(5)? == 1,
            })
        },
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("分类不存在"))
}

pub fn list_categories(conn: &Connection) -> Result<Vec<Category>, AppError> {
    let mut statement = conn.prepare(
        "SELECT child.id, child.parent_id, child.name, child.sort_order,
                child.active, child.built_in
         FROM category child
         LEFT JOIN category parent ON parent.id = child.parent_id
         ORDER BY COALESCE(parent.sort_order, child.sort_order),
                  CASE WHEN child.parent_id IS NULL THEN 0 ELSE 1 END,
                  child.sort_order,
                  child.name",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name: row.get(2)?,
            sort_order: row.get(3)?,
            active: row.get::<_, i64>(4)? == 1,
            built_in: row.get::<_, i64>(5)? == 1,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn create_category(
    conn: &mut Connection,
    parent_id: Option<&str>,
    name: &str,
) -> Result<Category, AppError> {
    let clean_name = validate_name(name)?;
    let transaction = conn.transaction()?;

    if let Some(parent) = parent_id {
        let parent_row = read_category(&transaction, parent)?;
        if parent.parent_id.is_some() {
            return Err(AppError::validation("分类最多只能有两级"));
        }
        if !parent_row.active {
            return Err(AppError::validation("不能在不启用的大类下新增分类"));
        }
    }

    let duplicate: i64 = transaction.query_row(
        "SELECT COUNT(*) FROM category
         WHERE name = ?1 COLLATE NOCASE
           AND ((parent_id IS NULL AND ?2 IS NULL) OR parent_id = ?2)",
        params![clean_name, parent_id],
        |row| row.get(0),
    )?;
    if duplicate > 0 {
        return Err(AppError::conflict("同一级分类下不能有重名分类"));
    }

    let next_sort: i64 = transaction.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) + 10 FROM category
         WHERE (parent_id IS NULL AND ?1 IS NULL) OR parent_id = ?1",
        [parent_id],
        |row| row.get(0),
    )?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    transaction.execute(
        "INSERT INTO category
         (id, parent_id, name, sort_order, active, built_in, created_at)
         VALUES (?1, ?2, ?3, ?4, 1, 0, ?5)",
        params![id, parent_id, clean_name, next_sort, now],
    )?;
    transaction.commit()?;
    read_category(conn, &id)
}

pub fn rename_category(
    conn: &Connection,
    id: &str,
    name: &str,
) -> Result<Category, AppError> {
    let clean_name = validate_name(name)?;
    let existing = read_category(conn, id)?;
    let duplicate: i64 = conn.query_row(
        "SELECT COUNT(*) FROM category
         WHERE id <> ?1
           AND name = ?2 COLLATE NOCASE
           AND ((parent_id IS NULL AND ?3 IS NULL) OR parent_id = ?3)",
        params![id, clean_name, existing.parent_id],
        |row| row.get(0),
    )?;
    if duplicate > 0 {
        return Err(AppError::conflict("同一级分类下不能有重名分类"));
    }
    conn.execute("UPDATE category SET name = ?2 WHERE id = ?1", params![id, clean_name])?;
    read_category(conn, id)
}

pub fn set_category_active(
    conn: &Connection,
    id: &str,
    active: bool,
) -> Result<Category, AppError> {
    let category = read_category(conn, id)?;
    if active {
        if let Some(parent_id) = category.parent_id.as_deref() {
            let parent = read_category(conn, parent_id)?;
            if !parent.active {
                return Err(AppError::validation("请先启用所属大类"));
            }
        }
    }
    if !active && category.parent_id.is_none() {
        let active_children: i64 = conn.query_row(
            "SELECT COUNT(*) FROM category WHERE parent_id = ?1 AND active = 1",
            [id],
            |row| row.get(0),
        )?;
        if active_children > 0 {
            return Err(AppError::conflict("请先停用该大类下的二级分类"));
        }
    }
    conn.execute(
        "UPDATE category SET active = ?2 WHERE id = ?1",
        params![id, i64::from(active)],
    )?;
    read_category(conn, id)
}

pub fn move_category(
    conn: &Connection,
    id: &str,
    new_parent_id: &str,
) -> Result<Category, AppError> {
    let category = read_category(conn, id)?;
    if category.parent_id.is_none() {
        return Err(AppError::validation("首版只支持调整二级分类所属大类"));
    }
    let parent = read_category(conn, new_parent_id)?;
    if parent.parent_id.is_some() {
        return Err(AppError::validation("分类最多只能有两级"));
    }
    if !parent.active {
        return Err(AppError::validation("目标大类当前未启用"));
    }
    let used: i64 = conn.query_row(
        "SELECT COUNT(*) FROM expense WHERE category_id = ?1",
        [id],
        |row| row.get(0),
    )?;
    if used > 0 {
        return Err(AppError::conflict("已有支出记录使用该分类，不能调整归属"));
    }
    let duplicate: i64 = conn.query_row(
        "SELECT COUNT(*) FROM category
         WHERE id <> ?1 AND parent_id = ?2 AND name = ?3 COLLATE NOCASE",
        params![id, new_parent_id, category.name],
        |row| row.get(0),
    )?;
    if duplicate > 0 {
        return Err(AppError::conflict("目标大类下已有同名分类"));
    }
    conn.execute(
        "UPDATE category SET parent_id = ?2 WHERE id = ?1",
        params![id, new_parent_id],
    )?;
    read_category(conn, id)
}
```

Modify `src-tauri/src/lib.rs` to add:

```rust
pub mod services;
```

- [ ] **Step 4: Run category tests**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test categories
```

Expected: all category tests pass.

- [ ] **Step 5: Commit category management**

Run:

```powershell
git add src-tauri/src/services src-tauri/src/lib.rs src-tauri/tests/categories.rs
git commit -m "feat: add category management services"
```

Expected: category services are committed.

---

### Task 4: Implement expense persistence, validation, and filtering

**Files:**
- Create: `src-tauri/src/services/expenses.rs`
- Modify: `src-tauri/src/services/mod.rs`
- Test: `src-tauri/tests/expenses.rs`

**Interfaces:**
- Consumes: `ExpenseDraft`, `ExpenseFilter`, `Expense`, database tables.
- Produces: `create_expense(&mut Connection, ExpenseDraft) -> Result<Expense, AppError>`.
- Produces: `update_expense(&mut Connection, &str, ExpenseDraft) -> Result<Expense, AppError>`.
- Produces: `delete_expense(&Connection, &str) -> Result<(), AppError>`.
- Produces: `list_expenses(&Connection, ExpenseFilter) -> Result<Vec<Expense>, AppError>`.
- Produces: `read_expense(&Connection, &str) -> Result<Expense, AppError>`.

- [ ] **Step 1: Write failing expense service tests**

Create `src-tauri/tests/expenses.rs` with:

```rust
use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::models::{ExpenseDraft, ExpenseFilter};
use heima_ledger_lib::services::expenses::{
    create_expense, delete_expense, list_expenses, update_expense,
};

fn draft(amount_cents: i64, spent_on: &str, category_id: &str) -> ExpenseDraft {
    ExpenseDraft {
        amount_cents,
        spent_on: spent_on.into(),
        category_id: category_id.into(),
        note: Some("  工作日午餐  ".into()),
    }
}

#[test]
fn creates_trims_and_lists_an_expense() {
    let mut conn = open_in_memory().unwrap();
    let created = create_expense(&mut conn, draft(1850, "2026-10-26", "food-meals")).unwrap();
    let rows = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();

    assert_eq!(created.amount_cents, 1850);
    assert_eq!(created.note.as_deref(), Some("工作日午餐"));
    assert_eq!(rows.len(), 1);
}

#[test]
fn rejects_invalid_amounts_dates_and_leaf_categories() {
    let mut conn = open_in_memory().unwrap();

    assert_eq!(
        create_expense(&mut conn, draft(0, "2026-10-26", "food-meals"))
            .unwrap_err()
            .code,
        "VALIDATION"
    );
    assert_eq!(
        create_expense(&mut conn, draft(100, "2026-02-30", "food-meals"))
            .unwrap_err()
            .code,
        "VALIDATION"
    );
    assert_eq!(
        create_expense(&mut conn, draft(100, "2026-10-26", "food"))
            .unwrap_err()
            .code,
        "VALIDATION"
    );
}

#[test]
fn filters_by_child_parent_and_literal_keyword() {
    let mut conn = open_in_memory().unwrap();
    create_expense(&mut conn, draft(1000, "2026-10-01", "food-meals")).unwrap();
    let mut shopping = draft(2000, "2026-10-02", "shopping-home");
    shopping.note = Some("100% 纯棉".into());
    create_expense(&mut conn, shopping).unwrap();

    let by_parent = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            parent_category_id: Some("food".into()),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    let literal_percent = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            keyword: Some("%".into()),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();

    assert_eq!(by_parent.len(), 1);
    assert_eq!(literal_percent.len(), 1);
    assert_eq!(literal_percent[0].parent_category_id, "shopping");
}

#[test]
fn updates_and_deletes_an_expense() {
    let mut conn = open_in_memory().unwrap();
    let row = create_expense(&mut conn, draft(1000, "2026-10-01", "food-meals")).unwrap();
    let updated = update_expense(
        &mut conn,
        &row.id,
        draft(1200, "2026-10-02", "food-breakfast"),
    )
    .unwrap();
    delete_expense(&conn, &row.id).unwrap();
    let remaining = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();

    assert_eq!(updated.amount_cents, 1200);
    assert_eq!(updated.category_id, "food-breakfast");
    assert!(remaining.is_empty());
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test expenses
```

Expected: compile failure because expense services do not exist.

- [ ] **Step 3: Implement expense validation and CRUD**

Create `src-tauri/src/services/expenses.rs` with:

```rust
use crate::error::AppError;
use crate::models::{Expense, ExpenseDraft, ExpenseFilter};
use chrono::{NaiveDate, SecondsFormat, Utc};
use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use uuid::Uuid;

fn validate_month(month: &str) -> Result<(), AppError> {
    NaiveDate::parse_from_str(&format!("{month}-01"), "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| AppError::validation("月份格式应为 YYYY-MM"))
}

fn validate_draft(conn: &Connection, draft: &ExpenseDraft) -> Result<String, AppError> {
    if !(1..=9_999_999_999).contains(&draft.amount_cents) {
        return Err(AppError::validation("金额需要在 ¥0.01 到 ¥99,999,999.99 之间"));
    }
    NaiveDate::parse_from_str(&draft.spent_on, "%Y-%m-%d")
        .map_err(|_| AppError::validation("日期格式应为 YYYY-MM-DD"))?;
    let note = draft.note.as_deref().map(str::trim).filter(|value| !value.is_empty());
    if note.is_some_and(|value| value.chars().count() > 200) {
        return Err(AppError::validation("备注不能超过 200 个字符"));
    }
    let parent_id: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM category WHERE id = ?1 AND parent_id IS NOT NULL",
            [&draft.category_id],
            |row| row.get(0),
        )
        .optional()?;
    if parent_id.is_none() {
        return Err(AppError::validation("请选择一个有效的二级分类"));
    }
    Ok(note.unwrap_or_default().to_string())
}

fn category_is_active(conn: &Connection, category_id: &str) -> Result<bool, AppError> {
    conn.query_row(
        "SELECT active = 1 FROM category WHERE id = ?1 AND parent_id IS NOT NULL",
        [category_id],
        |row| row.get(0),
    )
    .optional()
    .map(|value| value.unwrap_or(false))
    .map_err(AppError::from)
}

fn query_expense(conn: &Connection, id: &str) -> Result<Expense, AppError> {
    conn.query_row(
        "SELECT e.id, e.amount_cents, e.spent_on, e.category_id,
                child.name, parent.id, parent.name, e.note,
                e.created_at, e.updated_at
         FROM expense e
         JOIN category child ON child.id = e.category_id
         JOIN category parent ON parent.id = child.parent_id
         WHERE e.id = ?1",
        [id],
        |row| {
            Ok(Expense {
                id: row.get(0)?,
                amount_cents: row.get(1)?,
                spent_on: row.get(2)?,
                category_id: row.get(3)?,
                category_name: row.get(4)?,
                parent_category_id: row.get(5)?,
                parent_category_name: row.get(6)?,
                note: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("支出记录不存在"))
}

pub fn read_expense(conn: &Connection, id: &str) -> Result<Expense, AppError> {
    query_expense(conn, id)
}

pub fn create_expense(conn: &mut Connection, draft: ExpenseDraft) -> Result<Expense, AppError> {
    let note = validate_draft(conn, &draft)?;
    if !category_is_active(conn, &draft.category_id)? {
        return Err(AppError::validation("该分类已停用，请选择其他分类"));
    }
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let trimmed_note = if note.is_empty() { None } else { Some(note) };
    conn.execute(
        "INSERT INTO expense
         (id, amount_cents, spent_on, category_id, note, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id,
            draft.amount_cents,
            draft.spent_on,
            draft.category_id,
            trimmed_note,
            now
        ],
    )?;
    query_expense(conn, &id)
}

pub fn update_expense(
    conn: &mut Connection,
    id: &str,
    draft: ExpenseDraft,
) -> Result<Expense, AppError> {
    let existing = query_expense(conn, id)?;
    let note = validate_draft(conn, &draft)?;
    if draft.category_id != existing.category_id
        && !category_is_active(conn, &draft.category_id)?
    {
        return Err(AppError::validation("该分类已停用，请选择其他分类"));
    }
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let trimmed_note = if note.is_empty() { None } else { Some(note) };
    conn.execute(
        "UPDATE expense
         SET amount_cents = ?2, spent_on = ?3, category_id = ?4,
             note = ?5, updated_at = ?6
         WHERE id = ?1",
        params![
            id,
            draft.amount_cents,
            draft.spent_on,
            draft.category_id,
            trimmed_note,
            now
        ],
    )?;
    query_expense(conn, id)
}

pub fn delete_expense(conn: &Connection, id: &str) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM expense WHERE id = ?1", [id])?;
    if affected == 0 {
        return Err(AppError::not_found("支出记录不存在"));
    }
    Ok(())
}

pub fn list_expenses(conn: &Connection, filter: ExpenseFilter) -> Result<Vec<Expense>, AppError> {
    validate_month(&filter.month)?;
    let start = format!("{}-01", filter.month);
    let next_month = NaiveDate::parse_from_str(&start, "%Y-%m-%d")
        .expect("validated month")
        .checked_add_months(chrono::Months::new(1))
        .expect("next month")
        .format("%Y-%m-%d")
        .to_string();

    let mut sql = String::from(
        "SELECT e.id, e.amount_cents, e.spent_on, e.category_id,
                child.name, parent.id, parent.name, e.note,
                e.created_at, e.updated_at
         FROM expense e
         JOIN category child ON child.id = e.category_id
         JOIN category parent ON parent.id = child.parent_id
         WHERE e.spent_on >= ?1 AND e.spent_on < ?2",
    );
    let mut values = vec![Value::Text(start), Value::Text(next_month)];
    if let Some(parent_id) = filter.parent_category_id {
        values.push(Value::Text(parent_id));
        sql.push_str(&format!(" AND parent.id = ?{}", values.len()));
    }
    if let Some(category_id) = filter.category_id {
        values.push(Value::Text(category_id));
        sql.push_str(&format!(" AND child.id = ?{}", values.len()));
    }
    if let Some(keyword) = filter.keyword.map(|value| value.trim().to_string()) {
        if !keyword.is_empty() {
            let escaped = keyword
                .replace('\\', "\\\\")
                .replace('%', "\\%")
                .replace('_', "\\_");
            values.push(Value::Text(format!("%{escaped}%")));
            sql.push_str(&format!(
                " AND e.note LIKE ?{} ESCAPE '\\'",
                values.len()
            ));
        }
    }
    sql.push_str(" ORDER BY e.spent_on DESC, e.created_at DESC, e.id DESC");

    let mut statement = conn.prepare(&sql)?;
    let rows = statement.query_map(params_from_iter(values.iter()), |row| {
        Ok(Expense {
            id: row.get(0)?,
            amount_cents: row.get(1)?,
            spent_on: row.get(2)?,
            category_id: row.get(3)?,
            category_name: row.get(4)?,
            parent_category_id: row.get(5)?,
            parent_category_name: row.get(6)?,
            note: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}
```

Modify `src-tauri/src/services/mod.rs` to add:

```rust
pub mod expenses;
```

- [ ] **Step 4: Run expense tests**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test expenses
```

Expected: all expense tests pass, including literal `%` keyword search.

- [ ] **Step 5: Commit expense services**

Run:

```powershell
git add src-tauri/src/services/expenses.rs src-tauri/src/services/mod.rs src-tauri/tests/expenses.rs
git commit -m "feat: add validated expense persistence"
```

Expected: expense persistence is committed.

---

### Task 5: Implement monthly and hierarchical statistics

**Files:**
- Create: `src-tauri/src/services/stats.rs`
- Modify: `src-tauri/src/services/mod.rs`
- Test: `src-tauri/tests/stats.rs`

**Interfaces:**
- Consumes: `MonthSummary`, `CategoryTotal`, `ExpenseDraft`.
- Produces: `month_summary(&Connection, &str) -> Result<MonthSummary, AppError>`.
- Guarantees: `summary.total_cents == sum(first_level.amount_cents)` and each parent total equals its child total sum.

- [ ] **Step 1: Write failing statistics tests**

Create `src-tauri/tests/stats.rs` with:

```rust
use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::models::ExpenseDraft;
use heima_ledger_lib::services::expenses::create_expense;
use heima_ledger_lib::services::stats::month_summary;

fn add(conn: &mut rusqlite::Connection, cents: i64, date: &str, category: &str) {
    create_expense(
        conn,
        ExpenseDraft {
            amount_cents: cents,
            spent_on: date.into(),
            category_id: category.into(),
            note: None,
        },
    )
    .unwrap();
}

#[test]
fn totals_match_the_two_level_breakdown() {
    let mut conn = open_in_memory().unwrap();
    add(&mut conn, 1000, "2026-10-01", "food-meals");
    add(&mut conn, 500, "2026-10-31", "food-cafe");
    add(&mut conn, 2000, "2026-10-15", "housing-utilities");
    add(&mut conn, 9999, "2026-11-01", "food-meals");

    let summary = month_summary(&conn, "2026-10").unwrap();
    let first_level_sum: i64 = summary.categories.iter().map(|item| item.amount_cents).sum();
    let food = summary
        .categories
        .iter()
        .find(|item| item.category_id == "food")
        .unwrap();
    let food_child_sum: i64 = food.children.iter().map(|item| item.amount_cents).sum();

    assert_eq!(summary.total_cents, 3500);
    assert_eq!(first_level_sum, 3500);
    assert_eq!(food.amount_cents, 1500);
    assert_eq!(food_child_sum, 1500);
}

#[test]
fn rejects_an_invalid_month() {
    let conn = open_in_memory().unwrap();
    assert_eq!(month_summary(&conn, "2026-13").unwrap_err().code, "VALIDATION");
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test stats
```

Expected: compile failure because `services::stats` does not exist.

- [ ] **Step 3: Implement summary aggregation**

Create `src-tauri/src/services/stats.rs` with:

```rust
use crate::error::AppError;
use crate::models::{CategoryTotal, MonthSummary};
use chrono::{Months, NaiveDate};
use rusqlite::{params, Connection};
use std::collections::HashMap;

fn month_range(month: &str) -> Result<(String, String), AppError> {
    let start = NaiveDate::parse_from_str(&format!("{month}-01"), "%Y-%m-%d")
        .map_err(|_| AppError::validation("月份格式应为 YYYY-MM"))?;
    let next = start
        .checked_add_months(Months::new(1))
        .ok_or_else(|| AppError::validation("月份超出支持范围"))?;
    Ok((
        start.format("%Y-%m-%d").to_string(),
        next.format("%Y-%m-%d").to_string(),
    ))
}

pub fn month_summary(conn: &Connection, month: &str) -> Result<MonthSummary, AppError> {
    let (start, next) = month_range(month)?;
    let total_cents: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount_cents), 0)
         FROM expense WHERE spent_on >= ?1 AND spent_on < ?2",
        params![start, next],
        |row| row.get(0),
    )?;

    let mut statement = conn.prepare(
        "SELECT parent.id, parent.name, child.id, child.name,
                SUM(expense.amount_cents) AS amount
         FROM expense
         JOIN category child ON child.id = expense.category_id
         JOIN category parent ON parent.id = child.parent_id
         WHERE expense.spent_on >= ?1 AND expense.spent_on < ?2
         GROUP BY parent.id, parent.name, child.id, child.name
         ORDER BY parent.sort_order, parent.name, child.sort_order, child.name",
    )?;
    let rows = statement.query_map(params![start, next], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, i64>(4)?,
        ))
    })?;

    let mut parents: Vec<CategoryTotal> = Vec::new();
    let mut parent_index: HashMap<String, usize> = HashMap::new();
    for row in rows {
        let (parent_id, parent_name, child_id, child_name, amount_cents) = row?;
        let index = if let Some(index) = parent_index.get(&parent_id) {
            *index
        } else {
            let index = parents.len();
            parent_index.insert(parent_id.clone(), index);
            parents.push(CategoryTotal {
                category_id: parent_id,
                category_name: parent_name,
                amount_cents: 0,
                children: Vec::new(),
            });
            index
        };
        parents[index].amount_cents += amount_cents;
        parents[index].children.push(CategoryTotal {
            category_id: child_id,
            category_name: child_name,
            amount_cents,
            children: Vec::new(),
        });
    }

    let grouped_total: i64 = parents.iter().map(|item| item.amount_cents).sum();
    if grouped_total != total_cents {
        return Err(AppError {
            code: "STORAGE".into(),
            message: "分类统计与月度合计不一致，请检查本地数据".into(),
        });
    }

    Ok(MonthSummary {
        month: month.to_string(),
        total_cents,
        categories: parents,
    })
}
```

Modify `src-tauri/src/services/mod.rs` to add:

```rust
pub mod stats;
```

- [ ] **Step 4: Run statistics tests**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test stats
```

Expected: both tests pass.

- [ ] **Step 5: Commit statistics**

Run:

```powershell
git add src-tauri/src/services/stats.rs src-tauri/src/services/mod.rs src-tauri/tests/stats.rs
git commit -m "feat: add hierarchical monthly statistics"
```

Expected: statistics services are committed.

---

### Task 6: Connect Tauri commands and local application state

**Files:**
- Create: `src-tauri/src/app_state.rs`
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/tests/commands.rs`

**Interfaces:**
- Consumes: all database and service functions from Tasks 2-5.
- Produces: `AppState { data_dir: PathBuf, db_lock: Mutex<()> }`.
- Produces Tauri commands: `get_app_info`, `list_categories`, `create_category`, `rename_category`, `set_category_active`, `move_category`, `list_expenses`, `create_expense`, `update_expense`, `delete_expense`, `get_month_summary`.
- Produces frontend arguments in camelCase for snake_case Rust parameters.

- [ ] **Step 1: Write a failing command argument test**

Create `src-tauri/tests/commands.rs` with:

```rust
use heima_ledger_lib::models::ExpenseDraft;

#[test]
fn expense_draft_deserializes_camel_case_from_the_frontend() {
    let draft: ExpenseDraft = serde_json::from_str(
        r#"{"amountCents":1850,"spentOn":"2026-10-26","categoryId":"food-meals","note":"午餐"}"#,
    )
    .unwrap();

    assert_eq!(draft.amount_cents, 1850);
    assert_eq!(draft.category_id, "food-meals");
}
```

- [ ] **Step 2: Run the test to verify the current contract**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test commands
```

Expected: this test already passes because `ExpenseDraft` was annotated in Task 2. Continue with command wiring; if it does not compile, correct the DTO naming before adding commands.

- [ ] **Step 3: Implement application state and command adapters**

Create `src-tauri/src/app_state.rs` with:

```rust
use crate::db::open_database;
use crate::error::AppError;
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct AppState {
    pub data_dir: PathBuf,
    pub db_lock: Mutex<()>,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Result<Self, AppError> {
        std::fs::create_dir_all(data_dir.join("backups"))?;
        std::fs::create_dir_all(data_dir.join("logs"))?;
        std::fs::create_dir_all(data_dir.join("exports"))?;
        let state = Self {
            data_dir,
            db_lock: Mutex::new(()),
        };
        drop(state.open()?);
        Ok(state)
    }

    pub fn db_path(&self) -> PathBuf {
        self.data_dir.join("heima-ledger.db")
    }

    pub fn open(&self) -> Result<Connection, AppError> {
        open_database(&self.db_path())
    }

    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, ()>, AppError> {
        self.db_lock
            .lock()
            .map_err(|_| AppError::storage("数据库锁已损坏，请重新启动应用"))
    }

    pub fn data_dir_ref(&self) -> &Path {
        &self.data_dir
    }
}
```

Create `src-tauri/src/commands.rs` with:

```rust
use crate::app_state::AppState;
use crate::error::AppError;
use crate::models::{
    Category, Expense, ExpenseDraft, ExpenseFilter, MonthSummary,
};
use crate::services::{categories, expenses, stats};
use tauri::State;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub data_dir: String,
}

#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> AppInfo {
    AppInfo {
        name: "黑马记账".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        data_dir: state.data_dir_ref().display().to_string(),
    }
}

#[tauri::command]
pub fn list_categories(state: State<'_, AppState>) -> Result<Vec<Category>, AppError> {
    let _guard = state.lock()?;
    categories::list_categories(&state.open()?)
}

#[tauri::command]
pub fn create_category(
    state: State<'_, AppState>,
    parent_id: Option<String>,
    name: String,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::create_category(&mut state.open()?, parent_id.as_deref(), &name)
}

#[tauri::command]
pub fn rename_category(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::rename_category(&state.open()?, &id, &name)
}

#[tauri::command]
pub fn set_category_active(
    state: State<'_, AppState>,
    id: String,
    active: bool,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::set_category_active(&state.open()?, &id, active)
}

#[tauri::command]
pub fn move_category(
    state: State<'_, AppState>,
    id: String,
    new_parent_id: String,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::move_category(&state.open()?, &id, &new_parent_id)
}

#[tauri::command]
pub fn list_expenses(
    state: State<'_, AppState>,
    filter: ExpenseFilter,
) -> Result<Vec<Expense>, AppError> {
    let _guard = state.lock()?;
    expenses::list_expenses(&state.open()?, filter)
}

#[tauri::command]
pub fn create_expense(
    state: State<'_, AppState>,
    draft: ExpenseDraft,
) -> Result<Expense, AppError> {
    let _guard = state.lock()?;
    expenses::create_expense(&mut state.open()?, draft)
}

#[tauri::command]
pub fn update_expense(
    state: State<'_, AppState>,
    id: String,
    draft: ExpenseDraft,
) -> Result<Expense, AppError> {
    let _guard = state.lock()?;
    expenses::update_expense(&mut state.open()?, &id, draft)
}

#[tauri::command]
pub fn delete_expense(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let _guard = state.lock()?;
    expenses::delete_expense(&state.open()?, &id)
}

#[tauri::command]
pub fn get_month_summary(
    state: State<'_, AppState>,
    month: String,
) -> Result<MonthSummary, AppError> {
    let _guard = state.lock()?;
    stats::month_summary(&state.open()?, &month)
}
```

Modify `src-tauri/src/lib.rs` to:

```rust
pub mod app_state;
pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;

use app_state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let state = AppState::new(data_dir)
                .map_err(|error| Box::<dyn std::error::Error>::from(error))?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::list_categories,
            commands::create_category,
            commands::rename_category,
            commands::set_category_active,
            commands::move_category,
            commands::list_expenses,
            commands::create_expense,
            commands::update_expense,
            commands::delete_expense,
            commands::get_month_summary,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run 黑马记账");
}
```

- [ ] **Step 4: Verify command contracts and application startup**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

Expected: all Rust tests pass, and the app starts with its database in the operating system application data directory.

- [ ] **Step 5: Commit command wiring**

Run:

```powershell
git add src-tauri/src/app_state.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src-tauri/tests/commands.rs
git commit -m "feat: connect Tauri commands to ledger services"
```

Expected: the desktop shell and business services are connected.

---

### Task 7: Add typed frontend contracts and money utilities

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/money.ts`
- Create: `src/lib/money.test.ts`
- Create: `src/lib/date.ts`
- Create: `src/lib/date.test.ts`

**Interfaces:**
- Consumes: Tauri command names and camelCase DTOs.
- Produces: TypeScript types matching `models.rs`.
- Produces: `api` object for all frontend command calls.
- Produces: `parseMoneyToCents(raw: string): number | null`.
- Produces: `formatCny(cents: number): string`.
- Produces: `currentLocalDate(): string`, `currentMonth(): string`, `monthLabel(month: string): string`.

- [ ] **Step 1: Write failing money and date tests**

Create `src/lib/money.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { formatCny, parseMoneyToCents } from "./money";

describe("money helpers", () => {
  it("parses yuan amounts to integer cents", () => {
    expect(parseMoneyToCents("18")).toBe(1800);
    expect(parseMoneyToCents("18.5")).toBe(1850);
    expect(parseMoneyToCents("¥18.50")).toBe(1850);
    expect(parseMoneyToCents(" 0.01 ")).toBe(1);
  });

  it("rejects invalid and out-of-range amounts", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("0")).toBeNull();
    expect(parseMoneyToCents("1.001")).toBeNull();
    expect(parseMoneyToCents("-2")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("100000000")).toBeNull();
  });

  it("formats cents as two-decimal RMB", () => {
    expect(formatCny(123456).replace(/\s/g, "")).toBe("¥1,234.56");
  });
});
```

Create `src/lib/date.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { monthLabel } from "./date";

describe("date helpers", () => {
  it("formats a YYYY-MM month for the interface", () => {
    expect(monthLabel("2026-10")).toBe("2026 年 10 月");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
npx vitest run src/lib/money.test.ts src/lib/date.test.ts
```

Expected: FAIL because the utility modules do not exist.

- [ ] **Step 3: Implement frontend contracts and utilities**

Create `src/types/domain.ts` with:

```ts
export type PageKey = "overview" | "expenses" | "stats" | "settings";

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  active: boolean;
  builtIn: boolean;
}

export interface ExpenseDraft {
  amountCents: number;
  spentOn: string;
  categoryId: string;
  note: string | null;
}

export interface Expense {
  id: string;
  amountCents: number;
  spentOn: string;
  categoryId: string;
  categoryName: string;
  parentCategoryId: string;
  parentCategoryName: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilter {
  month: string;
  parentCategoryId?: string | null;
  categoryId?: string | null;
  keyword?: string | null;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  amountCents: number;
  children: CategoryTotal[];
}

export interface MonthSummary {
  month: string;
  totalCents: number;
  categories: CategoryTotal[];
}

export interface AppErrorShape {
  code: string;
  message: string;
}
```

Create `src/lib/api.ts` with:

```ts
import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  Expense,
  ExpenseDraft,
  ExpenseFilter,
  MonthSummary,
} from "../types/domain";

export interface AppInfo {
  name: string;
  version: string;
  dataDir: string;
}

export function getErrorMessage(cause: unknown, fallback: string): string {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "message" in cause &&
    typeof cause.message === "string"
  ) {
    return cause.message;
  }
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }
  return fallback;
}

export const api = {
  getAppInfo: () => invoke<AppInfo>("get_app_info"),
  listCategories: () => invoke<Category[]>("list_categories"),
  createCategory: (parentId: string | null, name: string) =>
    invoke<Category>("create_category", { parentId, name }),
  renameCategory: (id: string, name: string) =>
    invoke<Category>("rename_category", { id, name }),
  setCategoryActive: (id: string, active: boolean) =>
    invoke<Category>("set_category_active", { id, active }),
  moveCategory: (id: string, newParentId: string) =>
    invoke<Category>("move_category", { id, newParentId }),
  listExpenses: (filter: ExpenseFilter) =>
    invoke<Expense[]>("list_expenses", { filter }),
  createExpense: (draft: ExpenseDraft) =>
    invoke<Expense>("create_expense", { draft }),
  updateExpense: (id: string, draft: ExpenseDraft) =>
    invoke<Expense>("update_expense", { id, draft }),
  deleteExpense: (id: string) => invoke<void>("delete_expense", { id }),
  getMonthSummary: (month: string) =>
    invoke<MonthSummary>("get_month_summary", { month }),
};
```

Create `src/lib/money.ts` with:

```ts
const MAX_CENTS = 9_999_999_999;

export function parseMoneyToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/^¥/, "").replace(/,/g, "");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents >= 1 && cents <= MAX_CENTS ? cents : null;
}

export function formatCny(cents: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
```

Create `src/lib/date.ts` with:

```ts
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function currentLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonth(): string {
  return currentLocalDate().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${year} 年 ${Number(monthNumber)} 月`;
}
```

- [ ] **Step 4: Run frontend utility tests**

Run:

```powershell
npx vitest run src/lib/money.test.ts src/lib/date.test.ts
npm run build
```

Expected: all tests pass and TypeScript builds with no errors.

- [ ] **Step 5: Commit the frontend contract**

Run:

```powershell
git add src/types src/lib
git commit -m "feat: add typed frontend command contracts"
```

Expected: shared frontend contracts are committed.

---

### Task 8: Implement category selection and the quick-add drawer

**Files:**
- Create: `src/components/CategoryPicker.tsx`
- Create: `src/components/CategoryPicker.test.tsx`
- Create: `src/components/MoneyInput.tsx`
- Create: `src/components/ExpenseDrawer.tsx`
- Create: `src/components/ExpenseDrawer.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `Category`, `Expense`, `ExpenseDraft`, `api`.
- Produces: `CategoryPicker({ categories, value, onChange, recentIds })`.
- Produces: `ExpenseDrawer({ open, categories, expense, onClose, onSaved })`.
- ExpenseDrawer uses `api.createExpense` for new records and `api.updateExpense` for existing records.

- [ ] **Step 1: Write failing picker and drawer tests**

Create `src/components/CategoryPicker.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryPicker } from "./CategoryPicker";
import type { Category } from "../types/domain";

const categories: Category[] = [
  { id: "food", parentId: null, name: "餐饮美食", sortOrder: 10, active: true, builtIn: true },
  { id: "food-meals", parentId: "food", name: "正餐", sortOrder: 10, active: true, builtIn: true },
  { id: "food-cafe", parentId: "food", name: "咖啡茶饮", sortOrder: 20, active: true, builtIn: true },
];

describe("CategoryPicker", () => {
  it("selects a second-level category after its parent", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CategoryPicker categories={categories} value={null} onChange={onChange} recentIds={[]} />,
    );

    await user.click(screen.getByRole("button", { name: "餐饮美食" }));
    await user.click(screen.getByRole("button", { name: "正餐" }));

    expect(onChange).toHaveBeenCalledWith("food-meals");
  });
});
```

Create `src/components/ExpenseDrawer.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExpenseDrawer } from "./ExpenseDrawer";
import { api } from "../lib/api";
import type { Category } from "../types/domain";

vi.mock("../lib/api", () => ({
  getErrorMessage: (cause: unknown, fallback: string) =>
    cause instanceof Error ? cause.message : fallback,
  api: {
    createExpense: vi.fn().mockResolvedValue({}),
    updateExpense: vi.fn().mockResolvedValue({}),
  },
}));

const categories: Category[] = [
  { id: "food", parentId: null, name: "餐饮美食", sortOrder: 10, active: true, builtIn: true },
  { id: "food-meals", parentId: "food", name: "正餐", sortOrder: 10, active: true, builtIn: true },
];

describe("ExpenseDrawer", () => {
  it("saves a complete expense in cents", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <ExpenseDrawer
        open
        categories={categories}
        expense={null}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    await user.type(screen.getByLabelText("金额"), "18.50");
    await user.click(screen.getByRole("button", { name: "餐饮美食" }));
    await user.click(screen.getByRole("button", { name: "正餐" }));
    await user.type(screen.getByLabelText("备注"), "工作日午餐");
    await user.click(screen.getByRole("button", { name: "保存支出" }));

    expect(api.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 1850,
        categoryId: "food-meals",
        note: "工作日午餐",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("does not save an invalid amount", async () => {
    const user = userEvent.setup();
    render(
      <ExpenseDrawer
        open
        categories={categories}
        expense={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("金额"), "0");
    await user.click(screen.getByRole("button", { name: "保存支出" }));

    expect(screen.getByRole("alert")).toHaveTextContent("请输入大于 0 的有效金额");
    expect(api.createExpense).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
npx vitest run src/components/CategoryPicker.test.tsx src/components/ExpenseDrawer.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the category picker and money input**

Create `src/components/MoneyInput.tsx` with:

```tsx
interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function MoneyInput({ value, onChange }: MoneyInputProps) {
  return (
    <label className="field money-field">
      <span>金额</span>
      <div className="money-input-wrap">
        <span aria-hidden="true">¥</span>
        <input
          aria-label="金额"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
        />
      </div>
    </label>
  );
}
```

Create `src/components/CategoryPicker.tsx` with:

```tsx
import { useMemo, useState } from "react";
import type { Category } from "../types/domain";

interface CategoryPickerProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string) => void;
  recentIds: string[];
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  recentIds,
}: CategoryPickerProps) {
  const parents = categories.filter((item) => item.parentId === null && item.active);
  const selected = categories.find((item) => item.id === value) ?? null;
  const [parentId, setParentId] = useState(selected?.parentId ?? parents[0]?.id ?? null);
  const [query, setQuery] = useState("");

  const children = useMemo(() => {
    return categories
      .filter((item) => item.parentId === parentId && item.active)
      .filter((item) => item.name.includes(query.trim()))
      .sort((left, right) => {
        const leftRecent = recentIds.indexOf(left.id);
        const rightRecent = recentIds.indexOf(right.id);
        const leftRank = leftRecent === -1 ? Number.MAX_SAFE_INTEGER : leftRecent;
        const rightRank = rightRecent === -1 ? Number.MAX_SAFE_INTEGER : rightRecent;
        return leftRank - rightRank || left.sortOrder - right.sortOrder;
      });
  }, [categories, parentId, query, recentIds]);

  return (
    <fieldset className="category-picker">
      <legend>分类</legend>
      <div className="category-columns">
        <div role="group" aria-label="一级分类">
          {parents.map((parent) => (
            <button
              key={parent.id}
              type="button"
              aria-pressed={parent.id === parentId}
              onClick={() => setParentId(parent.id)}
            >
              {parent.name}
            </button>
          ))}
        </div>
        <div role="group" aria-label="二级分类">
          <input
            aria-label="搜索二级分类"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索小类"
          />
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              aria-pressed={child.id === value}
              onClick={() => onChange(child.id)}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 4: Implement the quick-add drawer and keyboard behavior**

Create `src/components/ExpenseDrawer.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { currentLocalDate } from "../lib/date";
import { parseMoneyToCents } from "../lib/money";
import type { Category, Expense } from "../types/domain";
import { CategoryPicker } from "./CategoryPicker";
import { MoneyInput } from "./MoneyInput";

interface ExpenseDrawerProps {
  open: boolean;
  categories: Category[];
  expense: Expense | null;
  onClose: () => void;
  onSaved: (expense: Expense) => void;
}

function initialAmount(expense: Expense | null): string {
  return expense ? (expense.amountCents / 100).toFixed(2) : "";
}

export function ExpenseDrawer({
  open,
  categories,
  expense,
  onClose,
  onSaved,
}: ExpenseDrawerProps) {
  const [amount, setAmount] = useState(initialAmount(expense));
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null);
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? currentLocalDate());
  const [note, setNote] = useState(expense?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(initialAmount(expense));
    setCategoryId(expense?.categoryId ?? null);
    setSpentOn(expense?.spentOn ?? currentLocalDate());
    setNote(expense?.note ?? "");
    setError("");
  }, [expense, open]);

  const recentIds = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("recentCategoryIds") ?? "[]") as string[];
    } catch {
      return [];
    }
  }, [open]);

  if (!open) return null;

  async function save() {
    const amountCents = parseMoneyToCents(amount);
    if (amountCents === null) {
      setError("请输入大于 0 的有效金额，最多两位小数");
      return;
    }
    if (!categoryId) {
      setError("请选择二级分类");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const draft = {
        amountCents,
        spentOn,
        categoryId,
        note: note.trim() || null,
      };
      const saved = expense
        ? await api.updateExpense(expense.id, draft)
        : await api.createExpense(draft);
      localStorage.setItem(
        "recentCategoryIds",
        JSON.stringify([categoryId, ...recentIds.filter((id) => id !== categoryId)].slice(0, 6)),
      );
      onSaved(saved);
    } catch (cause) {
      setError(getErrorMessage(cause, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void save();
        }}
      >
        <header>
          <h2 id="expense-drawer-title">{expense ? "编辑支出" : "记一笔"}</h2>
          <button type="button" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>
        <MoneyInput value={amount} onChange={setAmount} />
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          recentIds={recentIds}
        />
        <label className="field">
          <span>日期</span>
          <input
            aria-label="日期"
            type="date"
            value={spentOn}
            onChange={(event) => setSpentOn(event.target.value)}
          />
        </label>
        <label className="field">
          <span>备注</span>
          <textarea
            aria-label="备注"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "保存中" : "保存支出"}
          </button>
        </footer>
      </section>
    </div>
  );
}
```

Append drawer, picker, form, and focus styles to `src/styles/global.css`. At minimum define `.drawer-backdrop`, `.drawer`, `.field`, `.money-input-wrap`, `.category-columns`, `[role="alert"]`, and a visible `:focus-visible` outline using the existing `--gold` token.

- [ ] **Step 5: Run component tests and build**

Run:

```powershell
npx vitest run src/components/CategoryPicker.test.tsx src/components/ExpenseDrawer.test.tsx
npm run build
```

Expected: picker and drawer tests pass, and the production frontend compiles.

- [ ] **Step 6: Commit quick-add behavior**

Run:

```powershell
git add src/components src/styles/global.css
git commit -m "feat: add two-level expense entry drawer"
```

Expected: quick-add UI is committed.

---

### Task 9: Build overview, expense list, edit, and delete flows

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/FeedbackBanner.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/features/expenses/ExpenseTable.tsx`
- Create: `src/features/expenses/ExpenseFilters.tsx`
- Create: `src/pages/OverviewPage.tsx`
- Create: `src/pages/ExpensesPage.tsx`
- Create: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `api`, `Category`, `Expense`, `ExpenseFilter`, `MonthSummary`.
- Produces: `App` manages the active page, loaded categories, selected expense, drawer state, revision counter, and feedback banner; each page owns its selected month.
- Produces: `ExpenseTable({ expenses, onEdit, onDelete })`.
- Produces: `ExpenseFilters({ categories, filter, onChange })`.

- [ ] **Step 1: Replace the shell test with failing interaction tests**

Replace `src/App.test.tsx` with:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./lib/api";

vi.mock("./lib/api", () => ({
  getErrorMessage: (cause: unknown, fallback: string) =>
    cause instanceof Error ? cause.message : fallback,
  api: {
    listCategories: vi.fn(),
    listExpenses: vi.fn(),
    getMonthSummary: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
  },
}));

const categories = [
  { id: "food", parentId: null, name: "餐饮美食", sortOrder: 10, active: true, builtIn: true },
  { id: "food-meals", parentId: "food", name: "正餐", sortOrder: 10, active: true, builtIn: true },
];

const expense = {
  id: "e1",
  amountCents: 1850,
  spentOn: "2026-10-26",
  categoryId: "food-meals",
  categoryName: "正餐",
  parentCategoryId: "food",
  parentCategoryName: "餐饮美食",
  note: "午餐",
  createdAt: "2026-10-26T10:00:00Z",
  updatedAt: "2026-10-26T10:00:00Z",
};

beforeEach(() => {
  vi.mocked(api.listCategories).mockResolvedValue(categories);
  vi.mocked(api.listExpenses).mockResolvedValue([expense]);
  vi.mocked(api.getMonthSummary).mockResolvedValue({
    month: "2026-10",
    totalCents: 1850,
    categories: [
      {
        categoryId: "food",
        categoryName: "餐饮美食",
        amountCents: 1850,
        children: [
          {
            categoryId: "food-meals",
            categoryName: "正餐",
            amountCents: 1850,
            children: [],
          },
        ],
      },
    ],
  });
});

describe("expense workflows", () => {
  it("opens the list and edits a record", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "支出明细" }));

    expect(await screen.findByText("午餐")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "编辑 午餐" }));
    expect(screen.getByRole("dialog", { name: "编辑支出" })).toBeInTheDocument();
  });

  it("deletes only after confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteExpense).mockResolvedValue(undefined);
    render(<App />);
    await user.click(screen.getByRole("button", { name: "支出明细" }));
    await user.click(await screen.findByRole("button", { name: "删除 午餐" }));

    expect(api.deleteExpense).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(api.deleteExpense).toHaveBeenCalledWith("e1"));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
npx vitest run src/App.test.tsx
```

Expected: FAIL because navigation does not load expenses and edit/delete interactions are absent.

- [ ] **Step 3: Implement shared shell and confirmation components**

Create `src/components/AppShell.tsx` with:

```tsx
import type { ReactNode } from "react";
import type { PageKey } from "../types/domain";

interface AppShellProps {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
}

const items: Array<{ key: PageKey; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "expenses", label: "支出明细" },
  { key: "stats", label: "分类统计" },
  { key: "settings", label: "设置" },
];

export function AppShell({ page, onPageChange, children }: AppShellProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">黑马记账</div>
        <nav aria-label="主导航">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={page === item.key ? "active" : ""}
              aria-current={page === item.key ? "page" : undefined}
              onClick={() => onPageChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
```

Create `src/components/FeedbackBanner.tsx` with:

```tsx
interface FeedbackBannerProps {
  message: string;
  tone: "success" | "warning";
  onClose: () => void;
}

export function FeedbackBanner({ message, tone, onClose }: FeedbackBannerProps) {
  return (
    <div className={`feedback ${tone}`} role="status">
      <span>{message}</span>
      <button type="button" aria-label="关闭提示" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
```

Create `src/components/ConfirmDialog.tsx` with:

```tsx
interface ConfirmDialogProps {
  title: string;
  detail: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  detail,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <p>{detail}</p>
        <footer>
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="danger" disabled={busy} onClick={onConfirm}>
            {busy ? "处理中" : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Implement filters, table, overview, and expense page**

Create `src/features/expenses/ExpenseFilters.tsx` with:

```tsx
import type { Category, ExpenseFilter } from "../../types/domain";

interface ExpenseFiltersProps {
  categories: Category[];
  filter: ExpenseFilter;
  onChange: (filter: ExpenseFilter) => void;
}

export function ExpenseFilters({ categories, filter, onChange }: ExpenseFiltersProps) {
  const parents = categories.filter((item) => item.parentId === null);
  const children = categories.filter(
    (item) => item.parentId !== null && item.parentId === filter.parentCategoryId,
  );

  return (
    <section className="filters" aria-label="支出筛选">
      <label>
        <span>月份</span>
        <input
          type="month"
          value={filter.month}
          onChange={(event) => onChange({ ...filter, month: event.target.value })}
        />
      </label>
      <label>
        <span>一级分类</span>
        <select
          value={filter.parentCategoryId ?? ""}
          onChange={(event) =>
            onChange({
              ...filter,
              parentCategoryId: event.target.value || null,
              categoryId: null,
            })
          }
        >
          <option value="">全部</option>
          {parents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>二级分类</span>
        <select
          value={filter.categoryId ?? ""}
          disabled={!filter.parentCategoryId}
          onChange={(event) =>
            onChange({ ...filter, categoryId: event.target.value || null })
          }
        >
          <option value="">全部</option>
          {children.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>搜索备注</span>
        <input
          value={filter.keyword ?? ""}
          onChange={(event) => onChange({ ...filter, keyword: event.target.value })}
        />
      </label>
    </section>
  );
}
```

Create `src/features/expenses/ExpenseTable.tsx` with:

```tsx
import { formatCny } from "../../lib/money";
import type { Expense } from "../../types/domain";

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseTable({ expenses, onEdit, onDelete }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return <p className="empty-state">当前筛选条件下没有支出记录。</p>;
  }
  return (
    <table className="expense-table">
      <thead>
        <tr>
          <th>日期</th>
          <th>分类</th>
          <th>备注</th>
          <th className="amount">金额</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td>{expense.spentOn}</td>
            <td>
              {expense.parentCategoryName} / {expense.categoryName}
            </td>
            <td>{expense.note || "—"}</td>
            <td className="amount">{formatCny(expense.amountCents)}</td>
            <td>
              <button type="button" onClick={() => onEdit(expense)}>
                编辑 {expense.note || expense.categoryName}
              </button>
              <button type="button" onClick={() => onDelete(expense)}>
                删除 {expense.note || expense.categoryName}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Create `src/pages/OverviewPage.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { currentMonth, monthLabel } from "../lib/date";
import { formatCny } from "../lib/money";
import type { Expense, MonthSummary } from "../types/domain";

interface OverviewPageProps {
  revision: number;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
}

export function OverviewPage({ revision, onAdd, onEdit }: OverviewPageProps) {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getMonthSummary(month),
      api.listExpenses({ month }),
    ])
      .then(([nextSummary, expenses]) => {
        if (!active) return;
        setSummary(nextSummary);
        setRecent(expenses.slice(0, 10));
        setError("");
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause, "加载失败"));
      });
    return () => {
      active = false;
    };
  }, [month, revision]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p>{monthLabel(month)}</p>
          <h1>本月支出</h1>
          <strong className="hero-amount">{formatCny(summary?.totalCents ?? 0)}</strong>
        </div>
        <button type="button" className="primary" onClick={onAdd}>
          记一笔
        </button>
      </header>
      <label>
        <span>查看月份</span>
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <section>
        <h2>分类排行</h2>
        {summary?.categories.map((item) => (
          <div key={item.categoryId}>
            <span>{item.categoryName}</span>
            <span>{formatCny(item.amountCents)}</span>
          </div>
        ))}
      </section>
      <section>
        <h2>最近记录</h2>
        {recent.map((expense) => (
          <button
            key={expense.id}
            type="button"
            className="recent-row"
            onClick={() => onEdit(expense)}
          >
            <span>{expense.parentCategoryName} / {expense.categoryName}</span>
            <span>{expense.note || "无备注"}</span>
            <strong>{formatCny(expense.amountCents)}</strong>
          </button>
        ))}
      </section>
    </div>
  );
}
```

Create `src/pages/ExpensesPage.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { currentMonth } from "../lib/date";
import type { Category, Expense, ExpenseFilter } from "../types/domain";
import { ExpenseFilters } from "../features/expenses/ExpenseFilters";
import { ExpenseTable } from "../features/expenses/ExpenseTable";

interface ExpensesPageProps {
  categories: Category[];
  revision: number;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpensesPage({
  categories,
  revision,
  onEdit,
  onDelete,
}: ExpensesPageProps) {
  const [filter, setFilter] = useState<ExpenseFilter>({ month: currentMonth() });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .listExpenses(filter)
      .then((rows) => {
        if (!active) return;
        setExpenses(rows);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause, "加载失败"));
      });
    return () => {
      active = false;
    };
  }, [filter, revision]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>支出明细</h1>
      </header>
      <ExpenseFilters categories={categories} filter={filter} onChange={setFilter} />
      {error && <p role="alert">{error}</p>}
      <ExpenseTable expenses={expenses} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
```

- [ ] **Step 5: Wire application state and confirm deletion**

Replace `src/App.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ExpenseDrawer } from "./components/ExpenseDrawer";
import { FeedbackBanner } from "./components/FeedbackBanner";
import { api, getErrorMessage } from "./lib/api";
import { formatCny } from "./lib/money";
import { ExpensesPage } from "./pages/ExpensesPage";
import { OverviewPage } from "./pages/OverviewPage";
import type { Category, Expense, PageKey } from "./types/domain";

export default function App() {
  const [page, setPage] = useState<PageKey>("overview");
  const [categories, setCategories] = useState<Category[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "warning";
  } | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch((cause) =>
        setLoadError(getErrorMessage(cause, "分类加载失败")),
      );
  }, [revision]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setDrawerOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteExpense(deleting.id);
      setDeleting(null);
      setFeedback({ message: "支出记录已删除", tone: "success" });
      setRevision((value) => value + 1);
    } catch (cause) {
      setFeedback({
        message: getErrorMessage(cause, "删除失败"),
        tone: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell page={page} onPageChange={setPage}>
      {feedback && (
        <FeedbackBanner
          message={feedback.message}
          tone={feedback.tone}
          onClose={() => setFeedback(null)}
        />
      )}
      {loadError && <p role="alert">{loadError}</p>}
      {page === "overview" && (
        <OverviewPage revision={revision} onAdd={openCreate} onEdit={openEdit} />
      )}
      {page === "expenses" && (
        <ExpensesPage
          categories={categories}
          revision={revision}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}
      {page === "stats" && <h1>分类统计</h1>}
      {page === "settings" && <h1>设置</h1>}
      <ExpenseDrawer
        open={drawerOpen}
        categories={categories}
        expense={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          setFeedback({
            message: editing ? "支出已更新" : "支出已保存",
            tone: "success",
          });
          setRevision((value) => value + 1);
        }}
      />
      {deleting && (
        <ConfirmDialog
          title="确认删除这笔支出？"
          detail={`${deleting.spentOn} · ${deleting.parentCategoryName} / ${deleting.categoryName} · ${formatCny(deleting.amountCents)}`}
          confirmLabel="确认删除"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </AppShell>
  );
}
```

At this stage, Statistics and Settings render their page headings; Tasks 10 and 11 add their complete behavior before release.

- [ ] **Step 6: Run workflow tests and verify manually**

Run:

```powershell
npx vitest run src/App.test.tsx
npm run build
npm run tauri dev
```

Expected: edit and confirmed-delete tests pass. In the desktop window, adding a record refreshes the overview, the expense list supports all filters, editing preserves dates, and deletion updates both list and overview.

- [ ] **Step 7: Commit expense workflows**

Run:

```powershell
git add src/App.tsx src/App.test.tsx src/components src/features src/pages/OverviewPage.tsx src/pages/ExpensesPage.tsx src/styles/global.css
git commit -m "feat: add overview and expense list workflows"
```

Expected: expense review and editing flows are committed.

---

### Task 10: Build hierarchical statistics and category settings

**Files:**
- Create: `src/pages/StatsPage.tsx`
- Create: `src/features/categories/CategoryManager.tsx`
- Create: `src/pages/SettingsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `api.getMonthSummary`, category commands, `formatCny`.
- Produces: `StatsPage({ revision })`; month selector and expandable parent category rows.
- Produces: `CategoryManager({ categories, onChanged })`; create, rename, activate/deactivate, and move unused child categories.
- Produces: `SettingsPage({ categories, revision, onCategoriesChanged })`.

- [ ] **Step 1: Write failing statistics and category-management tests**

Append to `src/App.test.tsx`:

```tsx
it("shows the hierarchical monthly breakdown", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "分类统计" }));

  expect(await screen.findByText("餐饮美食")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "展开 餐饮美食" }));
  expect(screen.getByText("正餐")).toBeInTheDocument();
  expect(screen.getAllByText("¥1,850.00")).toHaveLength(2);
});

it("creates a second-level category from settings", async () => {
  const user = userEvent.setup();
  vi.mocked(api.createCategory).mockResolvedValue({
    id: "food-work",
    parentId: "food",
    name: "工作午餐",
    sortOrder: 80,
    active: true,
    builtIn: false,
  });
  render(<App />);
  await user.click(screen.getByRole("button", { name: "设置" }));
  await screen.findByRole("option", { name: "餐饮美食" });
  await user.selectOptions(screen.getByLabelText("所属大类"), "food");
  await user.type(screen.getByLabelText("分类名称"), "工作午餐");
  await user.click(screen.getByRole("button", { name: "新增分类" }));

  await waitFor(() =>
    expect(api.createCategory).toHaveBeenCalledWith("food", "工作午餐"),
  );
});
```

Update the `vi.mock("./lib/api")` object in that file to include:

```ts
createCategory: vi.fn(),
renameCategory: vi.fn(),
setCategoryActive: vi.fn(),
moveCategory: vi.fn(),
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
npx vitest run src/App.test.tsx
```

Expected: the new statistics test fails because the Statistics page is only a heading.

- [ ] **Step 3: Implement the statistics page**

Create `src/pages/StatsPage.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { currentMonth, monthLabel } from "../lib/date";
import { formatCny } from "../lib/money";
import type { MonthSummary } from "../types/domain";

interface StatsPageProps {
  revision: number;
}

export function StatsPage({ revision }: StatsPageProps) {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getMonthSummary(month)
      .then((value) => {
        if (!active) return;
        setSummary(value);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause, "统计加载失败"));
      });
    return () => {
      active = false;
    };
  }, [month, revision]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p>{monthLabel(month)}</p>
          <h1>分类统计</h1>
          <strong className="hero-amount">{formatCny(summary?.totalCents ?? 0)}</strong>
        </div>
        <input type="month" aria-label="统计月份" value={month} onChange={(event) => setMonth(event.target.value)} />
      </header>
      {error && <p role="alert">{error}</p>}
      <section className="stat-list">
        {summary?.categories.length === 0 && <p className="empty-state">本月还没有支出。</p>}
        {summary?.categories.map((parent) => {
          const isOpen = expanded.has(parent.categoryId);
          const percent = summary.totalCents === 0 ? 0 : (parent.amountCents / summary.totalCents) * 100;
          return (
            <article key={parent.categoryId}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "收起" : "展开"} ${parent.categoryName}`}
                onClick={() => toggle(parent.categoryId)}
              >
                <span>{parent.categoryName}</span>
                <strong>{formatCny(parent.amountCents)}</strong>
                <span>{percent.toFixed(1)}%</span>
              </button>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
              {isOpen && (
                <ul>
                  {parent.children.map((child) => (
                    <li key={child.categoryId}>
                      <span>{child.categoryName}</span>
                      <span>{formatCny(child.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Implement category management**

Create `src/features/categories/CategoryManager.tsx` with:

```tsx
import { useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import type { Category } from "../../types/domain";
import { ConfirmDialog } from "../ConfirmDialog";

interface CategoryManagerProps {
  categories: Category[];
  onChanged: () => void;
}

export function CategoryManager({ categories, onChanged }: CategoryManagerProps) {
  const parents = categories.filter((item) => item.parentId === null);
  const [parentId, setParentId] = useState("");
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [pendingDeactivate, setPendingDeactivate] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const children = categories.filter((item) => item.parentId === parentId);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      setError("");
      setNewName("");
      setRenamingId(null);
      onChanged();
    } catch (cause) {
      setError(getErrorMessage(cause, "分类操作失败"));
    }
  }

  function requestToggle(category: Category) {
    if (category.active) {
      setPendingDeactivate(category);
      return;
    }
    void run(() => api.setCategoryActive(category.id, true));
  }

  return (
    <section className="category-manager">
      <h2>分类管理</h2>
      <div className="category-create">
        <label>
          <span>所属大类</span>
          <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">新建一级分类</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>分类名称</span>
          <input value={newName} maxLength={20} onChange={(event) => setNewName(event.target.value)} />
        </label>
        <button
          type="button"
          disabled={!newName.trim()}
          onClick={() => void run(() => api.createCategory(parentId || null, newName))}
        >
          新增分类
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="category-columns">
        <div className="parent-list">
          {parents.map((parent) => (
            <div key={parent.id} className="category-row">
              {renamingId === parent.id ? (
                <>
                  <input
                    aria-label={`重命名 ${parent.name}`}
                    value={renameValue}
                    maxLength={20}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void run(() => api.renameCategory(parent.id, renameValue))}
                  >
                    保存名称
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)}>
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    aria-pressed={parent.id === parentId}
                    onClick={() => setParentId(parent.id)}
                  >
                    {parent.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`重命名 ${parent.name}`}
                    onClick={() => {
                      setRenamingId(parent.id);
                      setRenameValue(parent.name);
                    }}
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    aria-label={`${parent.active ? "停用" : "启用"} ${parent.name}`}
                    onClick={() => requestToggle(parent)}
                  >
                    {parent.active ? "停用" : "启用"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <ul>
          {children.map((child) => (
            <li key={child.id}>
              {renamingId === child.id ? (
                <>
                  <input
                    aria-label={`重命名 ${child.name}`}
                    value={renameValue}
                    maxLength={20}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void run(() => api.renameCategory(child.id, renameValue))}
                  >
                    保存名称
                  </button>
                </>
              ) : (
                <>
                  <span>{child.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(child.id);
                      setRenameValue(child.name);
                    }}
                  >
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() => requestToggle(child)}
                  >
                    {child.active ? "停用" : "启用"}
                  </button>
                  <label>
                    <span>移至其他大类</span>
                    <select
                      aria-label={`移动 ${child.name}`}
                      value={moveTargets[child.id] ?? ""}
                      onChange={(event) =>
                        setMoveTargets((current) => ({
                          ...current,
                          [child.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">请选择</option>
                      {parents
                        .filter((parent) => parent.active)
                        .map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    aria-label={`确认移动 ${child.name}`}
                    disabled={
                      !moveTargets[child.id] ||
                      moveTargets[child.id] === child.parentId
                    }
                    onClick={() =>
                      void run(() =>
                        api.moveCategory(child.id, moveTargets[child.id]),
                      )
                    }
                  >
                    移动
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      {pendingDeactivate && (
        <ConfirmDialog
          title="确认停用分类？"
          detail={`停用“${pendingDeactivate.name}”后，已有记录仍会保留，但新支出不能再选择该分类。`}
          confirmLabel="确认停用"
          onCancel={() => setPendingDeactivate(null)}
          onConfirm={() => {
            const category = pendingDeactivate;
            setPendingDeactivate(null);
            void run(() => api.setCategoryActive(category.id, false));
          }}
        />
      )}
    </section>
  );
}
```

Create `src/pages/SettingsPage.tsx` with:

```tsx
import type { Category } from "../types/domain";
import { CategoryManager } from "../features/categories/CategoryManager";

interface SettingsPageProps {
  categories: Category[];
  revision: number;
  onCategoriesChanged: () => void;
}

export function SettingsPage({
  categories,
  onCategoriesChanged,
}: SettingsPageProps) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>设置</h1>
      </header>
      <CategoryManager categories={categories} onChanged={onCategoriesChanged} />
    </div>
  );
}
```

Modify `src/App.tsx` to replace the two intermediate headings:

```tsx
{page === "stats" && <StatsPage revision={revision} />}
{page === "settings" && (
  <SettingsPage
    categories={categories}
    revision={revision}
    onCategoriesChanged={() => setRevision((value) => value + 1)}
  />
)}
```

Add the page imports:

```tsx
import { SettingsPage } from "./pages/SettingsPage";
import { StatsPage } from "./pages/StatsPage";
```

Append statistics and category-management styles to `src/styles/global.css`. The percentage bar must include an accessible text percentage in addition to its width.

- [ ] **Step 5: Run tests and manually check category rules**

Run:

```powershell
npx vitest run src/App.test.tsx
npm run build
npm run tauri dev
```

Expected: the hierarchical statistics test passes. In the app, a parent cannot be stopped while it has active children, category names enforce length limits, used categories cannot move, and inactive categories remain in historical records.

- [ ] **Step 6: Commit statistics and category settings**

Run:

```powershell
git add src/App.tsx src/App.test.tsx src/pages/StatsPage.tsx src/pages/SettingsPage.tsx src/features/categories src/styles/global.css
git commit -m "feat: add statistics and category settings"
```

Expected: statistics and category management are committed.

---

### Task 11: Add validation-backed backup, restore, and CSV export

**Files:**
- Create: `src-tauri/src/services/backups.rs`
- Create: `src-tauri/src/services/csv_export.rs`
- Modify: `src-tauri/src/services/mod.rs`
- Modify: `src-tauri/src/app_state.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/api.ts`
- Modify: `src/pages/SettingsPage.tsx`
- Test: `src-tauri/tests/backups.rs`

**Interfaces:**
- Consumes: database path, SQLite backup API, `schema_version`.
- Produces: `create_backup(&Connection, &Path) -> Result<(), AppError>`.
- Produces: `ensure_daily_backup(&AppState) -> Result<PathBuf, AppError>`.
- Produces: `validate_backup(&Path) -> Result<(), AppError>`.
- Produces: `restore_backup(&AppState, &Path) -> Result<(), AppError>`.
- Produces: `export_all_csv(&Connection, &Path) -> Result<usize, AppError>`.
- Produces commands: `ensure_daily_backup`, `create_backup`, `restore_backup`, `export_csv`, `open_data_dir`.
- Produces API methods with the same names and Settings page buttons for each action.

- [ ] **Step 1: Write failing backup and restore tests**

Create `src-tauri/tests/backups.rs` with:

```rust
use heima_ledger_lib::db::{open_database, open_in_memory};
use heima_ledger_lib::app_state::AppState;
use heima_ledger_lib::models::ExpenseDraft;
use heima_ledger_lib::services::backups::{
    create_backup, restore_backup, validate_backup,
};
use heima_ledger_lib::services::expenses::{create_expense, list_expenses};
use heima_ledger_lib::models::ExpenseFilter;
use tempfile::tempdir;

#[test]
fn backup_file_passes_integrity_and_schema_validation() {
    let directory = tempdir().unwrap();
    let source_path = directory.path().join("source.db");
    let backup_path = directory.path().join("backup.db");
    let mut source = open_database(&source_path).unwrap();
    create_expense(
        &mut source,
        ExpenseDraft {
            amount_cents: 1850,
            spent_on: "2026-10-26".into(),
            category_id: "food-meals".into(),
            note: Some("午餐".into()),
        },
    )
    .unwrap();

    create_backup(&source, &backup_path).unwrap();
    validate_backup(&backup_path).unwrap();

    let restored = open_database(&backup_path).unwrap();
    let rows = list_expenses(
        &restored,
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].amount_cents, 1850);
}

#[test]
fn validation_rejects_an_unrelated_sqlite_file() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("invalid.db");
    let conn = rusqlite::Connection::open(&path).unwrap();
    conn.execute_batch("CREATE TABLE unrelated(value TEXT);").unwrap();
    drop(conn);

    assert_eq!(validate_backup(&path).unwrap_err().code, "VALIDATION");
}

#[test]
fn failed_restore_validation_keeps_current_records() {
    let directory = tempdir().unwrap();
    let state = AppState::new(directory.path().to_path_buf()).unwrap();
    let mut current = state.open().unwrap();
    create_expense(
        &mut current,
        ExpenseDraft {
            amount_cents: 2600,
            spent_on: "2026-10-26".into(),
            category_id: "food-meals".into(),
            note: Some("保留记录".into()),
        },
    )
    .unwrap();
    drop(current);

    let invalid = directory.path().join("invalid-backup.db");
    rusqlite::Connection::open(&invalid)
        .unwrap()
        .execute_batch("CREATE TABLE unrelated(value TEXT);")
        .unwrap();
    assert_eq!(
        restore_backup(&state, &invalid).unwrap_err().code,
        "VALIDATION"
    );

    let rows = list_expenses(
        &state.open().unwrap(),
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].amount_cents, 2600);
}

#[test]
fn memory_database_is_supported_by_export_queries() {
    let conn = open_in_memory().unwrap();
    assert_eq!(conn.query_row("SELECT COUNT(*) FROM expense", [], |row| row.get::<_, i64>(0)).unwrap(), 0);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --test backups
```

Expected: compile failure because backup services do not exist.

- [ ] **Step 3: Implement backup validation and database replacement**

Create `src-tauri/src/services/backups.rs` with:

```rust
use crate::app_state::AppState;
use crate::db::open_database;
use crate::error::AppError;
use chrono::Local;
use rusqlite::backup::Backup;
use rusqlite::{Connection, OpenFlags};
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;

const CURRENT_SCHEMA: i64 = 1;

pub fn create_backup(source: &Connection, destination: &Path) -> Result<(), AppError> {
    let parent = destination
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    std::fs::create_dir_all(parent)?;
    let staging_dir = tempfile::tempdir_in(parent)?;
    let staged = staging_dir.path().join("backup.db");
    let mut target = Connection::open(&staged)?;
    let backup = Backup::new(source, &mut target)?;
    backup.run_to_completion(100, Duration::from_millis(10), None)?;
    target.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
    drop(target);
    validate_backup(&staged)?;

    let previous = parent.join(format!(".backup-previous-{}.db", Uuid::new_v4()));
    if destination.exists() {
        std::fs::rename(destination, &previous)?;
    }
    if let Err(error) = std::fs::rename(&staged, destination) {
        if previous.exists() {
            let _ = std::fs::rename(&previous, destination);
        }
        return Err(AppError::storage(error));
    }
    if previous.exists() {
        std::fs::remove_file(previous)?;
    }
    Ok(())
}

pub fn validate_backup(path: &Path) -> Result<(), AppError> {
    if !path.is_file() {
        return Err(AppError::validation("请选择有效的备份文件"));
    }
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|_| AppError::validation("无法读取该备份文件"))?;
    let integrity: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|_| AppError::validation("备份文件不是有效的黑马记账数据库"))?;
    if integrity != "ok" {
        return Err(AppError::validation("备份数据库完整性检查未通过"));
    }
    let schema: Option<i64> = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |row| row.get(0))
        .ok();
    if schema != Some(CURRENT_SCHEMA) {
        return Err(AppError::validation("备份数据库版本不受支持"));
    }
    Ok(())
}

pub fn ensure_daily_backup(state: &AppState) -> Result<PathBuf, AppError> {
    let _guard = state.lock()?;
    let today = Local::now().date_naive();
    let destination = state
        .data_dir_ref()
        .join("backups")
        .join(format!("{}.db", today.format("%Y-%m-%d")));
    if destination.exists() {
        validate_backup(&destination)?;
        return Ok(destination);
    }
    create_backup(&state.open()?, &destination)?;
    cleanup_backups(state.data_dir_ref(), 30)?;
    Ok(destination)
}

fn cleanup_backups(data_dir: &Path, keep: usize) -> Result<(), AppError> {
    let mut files: Vec<(std::time::SystemTime, PathBuf)> = std::fs::read_dir(data_dir.join("backups"))?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().and_then(|value| value.to_str()) == Some("db"))
        .filter_map(|entry| {
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((modified, entry.path()))
        })
        .collect();
    files.sort_by(|left, right| right.0.cmp(&left.0));
    for (_, path) in files.into_iter().skip(keep) {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

pub fn restore_backup(state: &AppState, source: &Path) -> Result<(), AppError> {
    validate_backup(source)?;
    let _guard = state.lock()?;
    let data_dir = state.data_dir_ref();
    let recovery = data_dir
        .join("backups")
        .join(format!(
            "before-restore-{}-{}.db",
            Local::now().format("%Y%m%d-%H%M%S"),
            Uuid::new_v4()
        ));
    create_backup(&state.open()?, &recovery)?;

    let staging_dir = tempfile::tempdir_in(data_dir)?;
    let staged = staging_dir.path().join("restore.db");
    std::fs::copy(source, &staged)?;
    validate_backup(&staged)?;
    let db_path = state.db_path();
    let previous = data_dir.join(format!("database-previous-{}.db", Uuid::new_v4()));
    state
        .open()?
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
    if db_path.exists() {
        std::fs::rename(&db_path, &previous)?;
    }
    for suffix in ["-wal", "-shm"] {
        let sidecar = PathBuf::from(format!("{}{suffix}", db_path.display()));
        if sidecar.exists() {
            std::fs::remove_file(sidecar)?;
        }
    }
    if let Err(error) = std::fs::rename(&staged, &db_path) {
        if previous.exists() {
            let _ = std::fs::rename(&previous, &db_path);
        }
        return Err(AppError::storage(error));
    }
    if let Err(error) = open_database(&db_path) {
        let _ = std::fs::remove_file(&db_path);
        if previous.exists() {
            let _ = std::fs::rename(&previous, &db_path);
            let _ = open_database(&db_path);
        }
        return Err(error);
    }
    if previous.exists() {
        std::fs::remove_file(previous)?;
    }
    Ok(())
}
```

- [ ] **Step 4: Implement atomic CSV export**

Create `src-tauri/src/services/csv_export.rs` with:

```rust
use crate::error::AppError;
use crate::models::{Expense, ExpenseFilter};
use crate::services::expenses::list_expenses;
use rusqlite::Connection;
use std::io::Write;
use std::path::Path;

pub fn export_all_csv(conn: &Connection, destination: &Path) -> Result<usize, AppError> {
    let months: Vec<String> = {
        let mut statement = conn.prepare(
            "SELECT DISTINCT substr(spent_on, 1, 7) AS month
             FROM expense ORDER BY month DESC",
        )?;
        let rows = statement.query_map([], |row| row.get(0))?;
        rows.collect::<Result<Vec<String>, _>>()?
    };

    let mut expenses: Vec<Expense> = Vec::new();
    for month in months {
        expenses.extend(list_expenses(
            conn,
            ExpenseFilter {
                month,
                ..ExpenseFilter::default()
            },
        )?);
    }

    let parent = destination
        .parent()
        .ok_or_else(|| AppError::validation("请选择有效的导出位置"))?;
    let mut temp = tempfile::NamedTempFile::new_in(parent)?;
    temp.write_all(&[0xEF, 0xBB, 0xBF])?;
    {
        let mut writer = csv::WriterBuilder::new()
            .has_headers(false)
            .from_writer(&mut temp);
        writer.write_record([
            "日期",
            "一级分类",
            "二级分类",
            "金额（元）",
            "备注",
            "记录编号",
        ])?;
        for expense in &expenses {
            writer.write_record([
                expense.spent_on.clone(),
                expense.parent_category_name.clone(),
                expense.category_name.clone(),
                format!("{}.{:02}", expense.amount_cents / 100, expense.amount_cents % 100),
                expense.note.clone().unwrap_or_default(),
                expense.id.clone(),
            ])?;
        }
        writer.flush()?;
    }
    if destination.exists() {
        std::fs::remove_file(destination)?;
    }
    temp.persist(destination)
        .map_err(|error| AppError::storage(error.error))?;
    Ok(expenses.len())
}
```

Modify `src-tauri/src/services/mod.rs` to:

```rust
pub mod backups;
pub mod categories;
pub mod csv_export;
pub mod expenses;
pub mod stats;
```

- [ ] **Step 5: Expose backup and export commands**

Append to `src-tauri/src/commands.rs`:

```rust
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub message: String,
    pub affected_count: Option<usize>,
}

#[tauri::command]
pub fn ensure_daily_backup(
    state: State<'_, AppState>,
) -> Result<OperationResult, AppError> {
    let path = crate::services::backups::ensure_daily_backup(&state)?;
    Ok(OperationResult {
        message: format!("自动备份已保存到 {}", path.display()),
        affected_count: None,
    })
}

#[tauri::command]
pub fn create_backup(
    state: State<'_, AppState>,
    destination: String,
) -> Result<OperationResult, AppError> {
    let _guard = state.lock()?;
    crate::services::backups::create_backup(
        &state.open()?,
        std::path::Path::new(&destination),
    )?;
    Ok(OperationResult {
        message: "备份已保存".into(),
        affected_count: None,
    })
}

#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    source: String,
) -> Result<OperationResult, AppError> {
    crate::services::backups::restore_backup(&state, std::path::Path::new(&source))?;
    Ok(OperationResult {
        message: "备份已恢复，请重新打开应用".into(),
        affected_count: None,
    })
}

#[tauri::command]
pub fn export_csv(
    state: State<'_, AppState>,
    destination: String,
) -> Result<OperationResult, AppError> {
    let _guard = state.lock()?;
    let count = crate::services::csv_export::export_all_csv(
        &state.open()?,
        std::path::Path::new(&destination),
    )?;
    Ok(OperationResult {
        message: format!("已导出 {count} 条记录"),
        affected_count: Some(count),
    })
}

#[tauri::command]
pub fn open_data_dir(state: State<'_, AppState>) -> String {
    state.data_dir_ref().display().to_string()
}
```

Add these commands to `generate_handler!` in `src-tauri/src/lib.rs`:

```rust
commands::ensure_daily_backup,
commands::create_backup,
commands::restore_backup,
commands::export_csv,
commands::open_data_dir,
```

- [ ] **Step 6: Add frontend API methods and Settings controls**

Append to `src/lib/api.ts` before the closing `};`:

```ts
ensureDailyBackup: () => invoke<OperationResult>("ensure_daily_backup"),
createBackup: (destination: string) =>
  invoke<OperationResult>("create_backup", { destination }),
restoreBackup: (source: string) =>
  invoke<OperationResult>("restore_backup", { source }),
exportCsv: (destination: string) =>
  invoke<OperationResult>("export_csv", { destination }),
openDataDir: () => invoke<string>("open_data_dir"),
```

Add this interface above `export const api`:

```ts
export interface OperationResult {
  message: string;
  affectedCount: number | null;
}
```

Replace `src/pages/SettingsPage.tsx` with:

```tsx
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CategoryManager } from "../features/categories/CategoryManager";
import { api, getErrorMessage, type AppInfo } from "../lib/api";
import type { Category } from "../types/domain";

interface SettingsPageProps {
  categories: Category[];
  revision: number;
  onCategoriesChanged: () => void;
}

export function SettingsPage({
  categories,
  onCategoriesChanged,
}: SettingsPageProps) {
  const [message, setMessage] = useState("");
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    api.getAppInfo().then(setInfo).catch(() => setInfo(null));
  }, []);

  async function run(action: () => Promise<string>) {
    try {
      setMessage(await action());
    } catch (cause) {
      setMessage(getErrorMessage(cause, "操作失败"));
    }
  }

  async function backupNow() {
    const destination = await save({
      title: "保存黑马记账备份",
      defaultPath: "黑马记账备份.db",
      filters: [{ name: "SQLite 数据库", extensions: ["db"] }],
    });
    if (destination) {
      await run(async () => (await api.createBackup(destination)).message);
    }
  }

  async function restoreNow() {
    const source = await open({
      title: "选择黑马记账备份",
      multiple: false,
      filters: [{ name: "SQLite 数据库", extensions: ["db"] }],
    });
    if (typeof source === "string") {
      setPendingRestore(source);
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    setRestoring(true);
    try {
      const result = await api.restoreBackup(pendingRestore);
      setMessage(`${result.message}。应用即将重新加载。`);
      setPendingRestore(null);
      window.location.reload();
    } catch (cause) {
      setPendingRestore(null);
      setMessage(getErrorMessage(cause, "恢复失败"));
    } finally {
      setRestoring(false);
    }
  }

  async function exportNow() {
    const destination = await save({
      title: "导出支出明细",
      defaultPath: "黑马记账支出.csv",
      filters: [{ name: "CSV 表格", extensions: ["csv"] }],
    });
    if (destination) {
      await run(async () => (await api.exportCsv(destination)).message);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>设置</h1>
      </header>
      {message && <p role="status">{message}</p>}
      <CategoryManager categories={categories} onChanged={onCategoriesChanged} />
      <section>
        <h2>数据管理</h2>
        <button type="button" onClick={() => void backupNow()}>
          立即备份
        </button>
        <button type="button" onClick={() => void restoreNow()}>
          从备份恢复
        </button>
        <button type="button" onClick={() => void exportNow()}>
          导出 CSV
        </button>
        <button
          type="button"
          onClick={() =>
            void run(async () => {
              const path = await api.openDataDir();
              await openPath(path);
              return "已打开数据目录";
            })
          }
        >
          打开数据目录
        </button>
      </section>
      <section>
        <h2>关于</h2>
        <p>黑马记账 {info?.version ?? "版本读取中"}</p>
        <p>数据保存在本机，应用首版不上传财务记录。</p>
        {info && <p>数据目录：{info.dataDir}</p>}
      </section>
      {pendingRestore && (
        <ConfirmDialog
          title="确认恢复这个备份？"
          detail="当前数据库会先自动备份，再用所选备份替换。恢复过程中不会上传任何数据。"
          confirmLabel="确认恢复"
          busy={restoring}
          onCancel={() => setPendingRestore(null)}
          onConfirm={() => void confirmRestore()}
        />
      )}
    </div>
  );
}
```

Update the `vi.mock("./lib/api")` object in `src/App.test.tsx` to include:

```ts
ensureDailyBackup: vi.fn().mockResolvedValue({
  message: "自动备份已保存",
  affectedCount: null,
}),
getAppInfo: vi.fn().mockResolvedValue({
  name: "黑马记账",
  version: "0.1.0",
  dataDir: "C:\\Test\\HeimaLedger",
}),
```

Modify `src/App.tsx` by adding this helper inside the component:

```tsx
function commitMutation(message: string) {
  setFeedback({ message, tone: "success" });
  setRevision((value) => value + 1);
  void api.ensureDailyBackup().catch((cause) => {
    setFeedback({
      message: `数据已保存，但自动备份失败：${
        getErrorMessage(cause, "请立即手动备份")
      }`,
      tone: "warning",
    });
  });
}
```

Replace the success branch after confirmed deletion with:

```tsx
commitMutation("支出记录已删除");
```

Replace the drawer `onSaved` success body with:

```tsx
setDrawerOpen(false);
commitMutation(editing ? "支出已更新" : "支出已保存");
```

Do not treat auto-backup failure as a failed save.

- [ ] **Step 7: Verify backup, export, and restore behavior**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
npx vitest run
npm run build
npm run tauri dev
```

Expected: all tests pass. In the app, a manual backup reopens successfully, an unrelated SQLite file is rejected without affecting current data, a CSV opens with correct Chinese and two-decimal amounts, and restore creates a `before-restore-*.db` safety copy before replacing the database.

- [ ] **Step 8: Commit data protection features**

Run:

```powershell
git add src-tauri/src/services/backups.rs src-tauri/src/services/csv_export.rs src-tauri/src/services/mod.rs src-tauri/src/app_state.rs src-tauri/src/commands.rs src-tauri/src/lib.rs src-tauri/tests/backups.rs src/lib/api.ts src/pages/SettingsPage.tsx src/App.tsx
git commit -m "feat: add backup restore and CSV export"
```

Expected: data protection and export features are committed.

---

### Task 12: Harden accessibility, performance, packaging, and release documentation

**Files:**
- Modify: `src/styles/global.css`
- Modify: `README.md`
- Test: `src/App.test.tsx`
- Test: `src-tauri/tests/performance.rs`

**Interfaces:**
- Consumes: the complete MVP.
- Produces: a Windows installable bundle, a reproducible macOS build command, keyboard-accessible controls, and a 10,000-record performance check.

- [ ] **Step 1: Add failing accessibility and bulk-data tests**

Update the React Testing Library import in `src/App.test.tsx` to:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
```

Append to `src/App.test.tsx`:

```tsx
it("exposes the current navigation page to assistive technology", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "分类统计" }));
  expect(screen.getByRole("button", { name: "分类统计" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("closes a confirmation dialog with Escape", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "支出明细" }));
  await user.click(await screen.findByRole("button", { name: "删除 午餐" }));
  fireEvent.keyDown(screen.getByRole("dialog", { name: "确认删除这笔支出？" }), {
    key: "Escape",
  });

  expect(
    screen.queryByRole("dialog", { name: "确认删除这笔支出？" }),
  ).not.toBeInTheDocument();
});
```

Create `src-tauri/tests/performance.rs` with:

```rust
use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::models::ExpenseFilter;
use heima_ledger_lib::services::expenses::list_expenses;
use heima_ledger_lib::services::stats::month_summary;
use std::time::Instant;

#[test]
fn filters_and_summarizes_ten_thousand_records_accurately() {
    let mut conn = open_in_memory().unwrap();
    let transaction = conn.transaction().unwrap();
    for index in 0..10_000 {
        let day = 1 + (index % 28);
        transaction
            .execute(
                "INSERT INTO expense
                 (id, amount_cents, spent_on, category_id, note, created_at, updated_at)
                 VALUES (?1, 100, ?2, 'food-meals', ?3, ?4, ?4)",
                rusqlite::params![
                    format!("record-{index}"),
                    format!("2026-10-{day:02}"),
                    format!("测试 {index}"),
                    "2026-10-01T00:00:00Z"
                ],
            )
            .unwrap();
    }
    transaction.commit().unwrap();

    let started = Instant::now();
    let rows = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            parent_category_id: Some("food".into()),
            keyword: Some("测试".into()),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    let summary = month_summary(&conn, "2026-10").unwrap();

    assert_eq!(rows.len(), 10_000);
    assert_eq!(summary.total_cents, 1_000_000);
    assert!(started.elapsed().as_secs() < 3);
}
```

- [ ] **Step 2: Run the tests to verify the accessibility test fails and validate performance**

Run:

```powershell
npx vitest run src/App.test.tsx
cargo test --manifest-path src-tauri/Cargo.toml --test performance --release
```

Expected: the Escape test fails because `ConfirmDialog` does not yet handle that key; the performance test passes.

- [ ] **Step 3: Complete keyboard, focus, and visual-state behavior**

Review every interactive element in `src/` and apply these concrete rules:

Add Escape handling to `src/components/ConfirmDialog.tsx` by rendering the modal section with:

```tsx
onKeyDown={(event) => {
  if (event.key === "Escape" && !busy) onCancel();
}}
tabIndex={-1}
```

```css
button,
input,
select,
textarea {
  min-height: 36px;
}

:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 2px;
}

dialog,
[role="dialog"],
.drawer {
  color: #1f2328;
  background: var(--surface);
}

.amount,
.hero-amount {
  font-variant-numeric: tabular-nums;
}

.amount {
  text-align: right;
}

.danger {
  background: var(--danger);
  color: white;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #5f5a50;
}
```

Ensure the Money input retains focus on an invalid save, `Escape` closes only the topmost drawer/dialog, and all icon-only buttons have an `aria-label`.

- [ ] **Step 4: Recreate all production icon sizes**

Generate every platform icon from the confirmed source asset:

```powershell
npx tauri icon src-tauri/icons/app-icon.svg
```

Expected: Tauri regenerates `.ico`, `.icns`, PNG, and Windows Store icon variants under `src-tauri/icons/` without errors.

- [ ] **Step 5: Build and inspect the Windows application**

Run:

```powershell
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Expected: tests pass and Tauri produces an NSIS executable and/or MSI under `src-tauri/target/release/bundle/`. Install the package, launch it from the Start menu, create and edit an expense, restart it, and confirm the record remains.

- [ ] **Step 6: Verify macOS on real hardware or CI**

On a macOS 12+ machine with Xcode Command Line Tools installed, run:

```bash
npm ci
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Expected: the tests pass and a `.dmg`/`.app` is produced under `src-tauri/target/release/bundle/`. Test both available CPU architectures or produce a universal build. Record the actual Mac test result before calling the release complete.

- [ ] **Step 7: Update the project status and release procedure**

Modify the status line in `README.md` from “尚未开始编写应用代码” to the actual verified status. Add a “本地开发与构建” section with these exact commands:

```powershell
npm install
npm run tauri dev
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Document that macOS packages must be built and tested on macOS, and that formal distribution requires Windows signing and Apple signing/notarization credentials. Do not claim macOS verification or signed distribution until those checks have actually been completed.

- [ ] **Step 8: Commit the release candidate**

Run:

```powershell
git add src src-tauri README.md
git commit -m "chore: prepare Windows and macOS release candidate"
```

Expected: the release candidate and its verification instructions are committed.

---

## Final Verification

After Task 12, use the `superpowers:verification-before-completion` skill before reporting completion.

Run:

```powershell
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Then manually verify:

- Create expenses with amounts `0.01`, `18.50`, and `99,999,999.99`.
- Reject `0`, three-decimal values, blank dates, blank categories, and invalid dates.
- Create, rename, stop, re-enable, and move an unused secondary category.
- Confirm a parent with active children cannot be stopped.
- Confirm a used category cannot be moved.
- Filter by month, parent category, child category, and a note containing a literal `%`.
- Edit and delete records, restarting the application after each action.
- Compare the monthly total to the sum of every first-level and second-level category.
- Export CSV and inspect its BOM, Chinese text, date values, and two-decimal amounts.
- Create a manual backup, mutate data, restore the backup, and confirm the mutation is reverted.
- Attempt to restore an unrelated SQLite file and confirm current data remains intact.
- Verify 10,000 seeded records remain usable for filtering and statistics.
- Run the installed Windows build and the macOS build on their target operating systems.
