# 🚀 Deploy Family Tree App (Free)

Deploy the full-stack app to **Render.com** (free) + **MongoDB Atlas** (free) in ~15 minutes.

---

## 1. Set Up MongoDB Atlas (Free)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create a free account
2. **Create a Cluster** → Choose **M0 Free Tier** → Pick any region
3. **Database Access** → Add a database user (username + password)
4. **Network Access** → Click **"Allow Access from Anywhere"** (`0.0.0.0/0`)
5. **Connect** → Choose **"Connect your application"** → Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/familytree?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with your database user credentials.

---

## 2. Push to GitHub

```bash
cd /path/to/Fam-Tree
git init
git add .
git commit -m "Initial commit - Family Tree App"
git remote add origin https://github.com/YOUR_USERNAME/family-tree-app.git
git push -u origin main
```

---

## 3. Deploy on Render.com (Free)

1. Go to [render.com](https://render.com) → Sign up (use GitHub)
2. Click **"New +"** → **"Web Service"**
3. Connect your **GitHub repo**
4. Configure:
   | Setting | Value |
   |---------|-------|
   | **Name** | `family-tree-app` (or any name) |
   | **Runtime** | Node |
   | **Build Command** | `npm run render-build` |
   | **Start Command** | `npm start` |
   | **Plan** | Free |

5. Add **Environment Variables** (click "Advanced" → "Add Environment Variable"):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | *(your Atlas connection string from step 1)* |
   | `SESSION_SECRET` | *(any random string, e.g. `my-super-secret-key-123`)* |
   | `CLIENT_URL` | *(leave empty for now, set after first deploy)* |

6. Click **"Create Web Service"** → Wait for build (~3-5 min)
7. Once deployed, copy your URL (e.g. `https://family-tree-app.onrender.com`)
8. Go to **Environment** → Set `CLIENT_URL` to your Render URL → **Save** (triggers redeploy)

---

## 4. Seed Demo Data

After the app is deployed, seed the demo family tree:

### Option A: Local seed (easiest)
```bash
# In your local project, temporarily update server/.env:
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/familytree?retryWrites=true&w=majority

# Run seed
cd server
node seed.js

# Restore local .env after seeding
```

### Option B: Render Shell
1. In Render dashboard → Your service → **"Shell"** tab
2. Run:
   ```bash
   cd server && node seed.js
   ```

---

## 5. Visit Your App! 🎉

Open your Render URL → Click **"Try Demo"** → Explore the family tree!

```
https://family-tree-app.onrender.com
```

---

## Notes

- **Free tier limits**: Render free services spin down after 15 min of inactivity. First visit after idle takes ~30 seconds to wake up.
- **MongoDB Atlas free tier**: 512MB storage, shared cluster. More than enough for demo.
- **Facebook OAuth**: Optional. Demo login works without it. To enable Facebook login, set `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, and `FACEBOOK_CALLBACK_URL` in Render environment variables.
- **Custom domain**: Render free tier supports custom domains. Go to Settings → Custom Domains.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page after deploy | Make sure `npm run render-build` completed successfully in build logs |
| "Demo data not found" | Run `node seed.js` against your Atlas database (see step 4) |
| Login doesn't persist | Check that `CLIENT_URL` matches your exact Render URL (with `https://`) |
| MongoDB connection error | Verify Atlas Network Access allows `0.0.0.0/0` and credentials are correct |
