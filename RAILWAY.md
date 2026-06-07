# Deploying to Railway

Two Railway services are needed: **API Server** and **Admin Panel**.

---

## Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repo (push this codebase to GitHub first if not done)

---

## Step 2 — API Server service

1. Add a new service → **Deploy from GitHub repo**
2. Set **Root Directory** to `/` (monorepo root)
3. Leave **Config File Path** as `railway.toml` (default)
4. Set these environment variables in Railway dashboard:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | *(set automatically by Railway)* |
| `SESSION_SECRET` | *(copy from Replit secrets)* |
| `STRIPE_SECRET_KEY` | *(copy from Replit secrets)* |
| `STRIPE_WEBHOOK_SECRET` | *(copy from Replit secrets)* |
| `DATABASE_URL` | *(your Postgres connection string)* |

5. Once deployed, copy the Railway URL (e.g. `https://soul-remembrance-api.up.railway.app`)

---

## Step 3 — Admin Panel service

1. Add another new service → **Deploy from same GitHub repo**
2. Set **Root Directory** to `/`
3. Set **Config File Path** to `railway-admin.toml`
4. No extra environment variables needed (admin uses Firebase directly)

---

## Step 4 — Update mobile app API URL

Once you have the Railway API URL, update **all three profiles** in `eas.json`:

```json
"EXPO_PUBLIC_API_URL": "https://your-api.up.railway.app"
```

Then trigger a new EAS production build:
```
pnpm --filter @workspace/mobile exec eas build --profile production --platform android
```

---

## Step 5 — Stripe webhook

Update your Stripe webhook endpoint from:
```
https://soul-remembrance.replit.app/api/webhooks/stripe
```
to:
```
https://your-api.up.railway.app/api/webhooks/stripe
```

Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) to update it.

---

## Notes

- Railway auto-assigns HTTPS domains — no SSL config needed
- The mobile app (Expo/EAS) is **not** hosted on Railway — it's distributed via Play Store / App Store
- Firebase (Firestore, Auth, Storage) is unaffected — it stays on Google's infrastructure
