# Contributing to Agentic System Initializer

Thank you for your interest in contributing! This project welcomes community contributions through a structured, issue-first workflow.

## 🚀 How to Contribute

### Step 1: Find or Create an Issue

All contributions **must** be linked to an approved issue. Do not open a PR without one.

1. Check [existing issues](https://github.com/david-kokkilic_deopca/agentic-system-initializer/issues) for something you'd like to work on.
2. If no issue exists, [create a new one](https://github.com/david-kokkilic_deopca/agentic-system-initializer/issues/new/choose) using the appropriate template.
3. **Wait for the issue to be approved** — look for the `approved` label added by a maintainer.

> ⚠️ PRs linked to unapproved issues will be closed automatically.

### Step 2: Fork & Branch

1. Fork the repository to your GitHub account.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/agentic-system-initializer.git
   cd agentic-system-initializer
   ```
3. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/issue-<number>-short-description
   ```

### Step 3: Develop

1. Install dependencies:
   ```bash
   cd packages/cli && npm install
   ```
2. Make your changes following our conventions (see below).
3. Test your changes:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```

### Step 4: Commit

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug description
docs: update contribution guide
chore: maintenance task
```

### Step 5: Open a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/issue-<number>-short-description
   ```
2. Open a PR against `main` on the upstream repository.
3. In the PR description, include:
   ```
   Closes #<issue-number>
   ```
4. Fill out the PR template completely.

### Step 6: Review Process

- A maintainer from the core team will review your PR.
- Only PRs linked to **approved issues** (labeled `approved`) will be reviewed.
- Address any requested changes promptly.
- Once approved by a maintainer, the PR will be merged.

## 📋 Issue Approval Process

| Step | Actor | Action |
|------|-------|--------|
| 1 | Contributor | Creates an issue using a template |
| 2 | Maintainer | Reviews the issue |
| 3 | Maintainer | Adds `approved` label if accepted |
| 4 | Contributor | Starts working on the approved issue |

Issues that are not approved may be closed with an explanation.

## 🏷️ Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/issue-<N>-description` | `feat/issue-42-add-template-engine` |
| Bug Fix | `fix/issue-<N>-description` | `fix/issue-13-cli-crash` |
| Docs | `docs/issue-<N>-description` | `docs/issue-7-api-reference` |

## 🔒 Who Can Approve & Merge

- Only the project owner (@david-kokkilic_deopca) and designated team members can:
  - Approve issues (add the `approved` label)
  - Review and merge pull requests
  - Create releases

## 📝 Code Style

- TypeScript with strict mode
- ESM modules (`"type": "module"`)
- Use `chalk` for CLI colors, `@clack/prompts` for interactive prompts
- Prefer small, focused commits

## ❓ Questions?

Open a [Discussion](https://github.com/david-kokkilic_deopca/agentic-system-initializer/discussions) if you have questions that aren't bugs or feature requests.
