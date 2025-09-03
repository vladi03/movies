# CI/CD Plan – Two Firebase Projects (Dev & Prod) with One Workflow

This plan sets up a single GitHub Actions workflow to deploy to two fully separated Firebase projects:
- Dev project: used for all non‑main branches (functions, hosting, rules)
- Prod project: used only for `main` (functions, hosting, rules)

Benefits
- True segmentation of data, functions, and auth between environments
- Safe to auto‑deploy dev on every push; prod only on merge to main
- One workflow supports both automatic and manual runs (with inputs)

Assumptions
- You have created two Firebase projects (IDs shown as examples):
  - Dev: `movies-dev-7cd18`
  - Prod: `movies-3caeb` (your production project)
- You created a Web App in each project and have separate client config for each.
- Functions use project‑level secrets (OpenAI key) set in each project.

---

## GitHub Actions – Single Workflow

File: `.github/workflows/firebase-deploy.yml`

Triggers
- `push` to any branch (dev) and `push` to `main` (prod)
- `workflow_dispatch` with inputs

Inputs (manual run)
- `env`: dev | prod (default: auto‑detect from branch)
- `branch`: branch ref to checkout (default: current)

High‑level steps
1) Checkout (optionally the input branch)
2) Setup Node and cache
3) Install deps for `web/` and `functions/`
4) Create `web/.env` from environment‑specific GitHub Secrets (dev or prod)
5) Build web
6) Install Firebase CLI and authenticate using the environment’s token
7) Deploy to the selected project
   - Prod (`main`): `firebase deploy --only functions,hosting,firestore:rules --project movies-3caeb`
   - Dev (non‑main): `firebase deploy --only functions,hosting,firestore:rules --project movies-dev-7cd18`

Example workflow (abbreviated)
```yaml
name: Firebase Deploy (Dev/Prod)

on:
  push:
    branches: ["**"]
  workflow_dispatch:
    inputs:
      env:
        description: "Environment (dev|prod)"
        required: false
        default: ""
      branch:
        description: "Branch to deploy"
        required: false
        default: ""
      # optional override for project ids
      firebase_project_id:
        description: "Explicit Firebase project id (overrides env)"
        required: false
        default: ""

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.branch || github.ref }}

      - name: Use Node 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install deps (web)
        run: |
          cd web
          npm ci

      - name: Install deps (functions)
        run: |
          cd functions
          npm ci

      - name: Determine environment
        id: pick
        run: |
          BRANCH="${{ inputs.branch || github.ref_name }}"
          CHOSEN_ENV="${{ inputs.env }}"
          if [ "$CHOSEN_ENV" = "prod" ] || [ "$BRANCH" = "main" ]; then
            echo "env=prod" >> $GITHUB_OUTPUT
            echo "project=movies-3caeb" >> $GITHUB_OUTPUT
            echo "token=${{ secrets.FIREBASE_TOKEN_PROD }}" >> $GITHUB_OUTPUT
            echo "prefix=PROD" >> $GITHUB_OUTPUT
          else
            echo "env=dev" >> $GITHUB_OUTPUT
            echo "project=movies-dev-7cd18" >> $GITHUB_OUTPUT
            echo "token=${{ secrets.FIREBASE_TOKEN_DEV }}" >> $GITHUB_OUTPUT
            echo "prefix=DEV" >> $GITHUB_OUTPUT
          fi
          # Allow explicit project override
          if [ -n "${{ inputs.firebase_project_id }}" ]; then
            echo "project=${{ inputs.firebase_project_id }}" >> $GITHUB_OUTPUT
          fi

      - name: Create web env (.env for Vite)
        run: |
          # Select secrets by prefix (DEV|PROD)
          if [ "${{ steps.pick.outputs.env }}" = "prod" ]; then PREFIX=PROD; else PREFIX=DEV; fi
          cat > web/.env <<EOF
          VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY_PROD }}
          VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.VITE_FIREBASE_AUTH_DOMAIN_PROD }}
          VITE_FIREBASE_PROJECT_ID=${{ secrets.VITE_FIREBASE_PROJECT_ID_PROD }}
          VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID_PROD }}
          VITE_FIREBASE_STORAGE_BUCKET=${{ secrets.VITE_FIREBASE_STORAGE_BUCKET_PROD }}
          VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID_PROD }}
          VITE_FUNCTIONS_REGION=${{ secrets.VITE_FUNCTIONS_REGION || 'us-central1' }}
          EOF
          if [ "${{ steps.pick.outputs.env }}" = "dev" ]; then
            cat > web/.env <<EOF
            VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY_DEV }}
            VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.VITE_FIREBASE_AUTH_DOMAIN_DEV }}
            VITE_FIREBASE_PROJECT_ID=${{ secrets.VITE_FIREBASE_PROJECT_ID_DEV }}
            VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID_DEV }}
            VITE_FIREBASE_STORAGE_BUCKET=${{ secrets.VITE_FIREBASE_STORAGE_BUCKET_DEV }}
            VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID_DEV }}
            VITE_FUNCTIONS_REGION=${{ secrets.VITE_FUNCTIONS_REGION || 'us-central1' }}
            EOF
          fi

      - name: Build web
        run: |
          cd web
          npm run build

      - name: Install Firebase CLI
        run: npm i -g firebase-tools@latest

      - name: Firebase auth (token for selected env)
        env:
          FIREBASE_TOKEN: ${{ steps.pick.outputs.token }}
        run: |
          firebase --project "${{ steps.pick.outputs.project }}" experiments:enable webframeworks && \
          firebase projects:list 1>/dev/null

      - name: Deploy (functions + hosting + firestore rules)
        env:
          FIREBASE_TOKEN: ${{ steps.pick.outputs.token }}
        run: |
          firebase deploy --only functions,hosting,firestore:rules --project "${{ steps.pick.outputs.project }}"
```

Notes
- Dev and prod use different Firebase projects, so functions and rules are safe to auto‑deploy for dev pushes.
- You can still use Hosting Preview Channels inside each project if desired by swapping the deploy command for dev.

---

## Required GitHub Secrets

Firebase CLI tokens (one per project)
- `FIREBASE_TOKEN_DEV` – run `firebase login:ci` while using the dev project
- `FIREBASE_TOKEN_PROD` – run `firebase login:ci` while using the prod project

Web build environment (Vite) – DEV
- `VITE_FIREBASE_API_KEY_DEV`
- `VITE_FIREBASE_AUTH_DOMAIN_DEV`
- `VITE_FIREBASE_PROJECT_ID_DEV`
- `VITE_FIREBASE_APP_ID_DEV`
- `VITE_FIREBASE_STORAGE_BUCKET_DEV`
- `VITE_FIREBASE_MESSAGING_SENDER_ID_DEV`

Web build environment (Vite) – PROD
- `VITE_FIREBASE_API_KEY_PROD`
- `VITE_FIREBASE_AUTH_DOMAIN_PROD`
- `VITE_FIREBASE_PROJECT_ID_PROD`
- `VITE_FIREBASE_APP_ID_PROD`
- `VITE_FIREBASE_STORAGE_BUCKET_PROD`
- `VITE_FIREBASE_MESSAGING_SENDER_ID_PROD`

Optional
- `VITE_FUNCTIONS_REGION` (defaults to `us-central1` if not provided)

Where to find these values
- Firebase Console (for each project) → Project settings → General → Your apps → Web app config. Copy the fields into Secrets as‑is.

Function runtime secrets (OpenAI)
- Set per project using Firebase Secrets (run once):
  - Dev: `firebase functions:secrets:set OPENAI_API_KEY --project movies-dev-7cd18`
  - Prod: `firebase functions:secrets:set OPENAI_API_KEY --project movies-3caeb`
- The local emulator uses `functions/.env`; production functions should read via secrets.

Optional alternative – Service Account instead of token
- Instead of `FIREBASE_TOKEN`, you can use a Google Cloud Service Account with Workload Identity Federation or a JSON key. That requires additional setup in Google Cloud IAM (not in Firebase Console). For simplicity, this plan uses `FIREBASE_TOKEN`.

---

## Firebase Project Configuration

Repository expectations
- `firebase.json` already defines Hosting public dir, Functions source, and Firestore rules.
- Update `.firebaserc` to include both projects (aliases):
```json
{
  "projects": {
    "dev": "movies-dev-7cd18",
    "prod": "movies-3caeb",
    "default": "prod"
  }
}
```
This is optional when passing `--project`, but helps local commands.

---

## Manual Run Examples

Run dev for a feature branch
- Actions → Firebase Deploy → Run workflow
  - env: `dev`
  - branch: `feature/my-change`

Run prod (full deploy) from main
- Merge to `main` and let CI auto‑deploy
- Or run manually with:
  - env: `prod`
  - branch: `main`


---

## Next Steps to Enable
1) Create GitHub Secrets listed above.
2) (Optional) Create an additional Hosting site for a stable dev URL.
3) Add the workflow file as shown.
4) Ensure Functions reference production secrets using Firebase `functions:secrets` (code update with `defineSecret` recommended).
5) Test: push to a non‑main branch, confirm preview channel URL; then merge to `main` to verify prod deploy.
