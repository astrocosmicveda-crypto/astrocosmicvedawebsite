# Cloudflare Pages Deployment Guide

This guide explains how to deploy your astrology website to Cloudflare Pages with ChatGPT integration.

## Prerequisites

1. A GitHub account with your code repository
2. A Cloudflare account (free tier works)
3. An OpenAI API key

## Step 1: Push Your Code to GitHub

Make sure all your files are committed and pushed to GitHub:

```bash
git add .
git commit -m "Add Cloudflare Pages Function for ChatGPT"
git push origin main
```

## Step 2: Deploy to Cloudflare Pages

1. **Go to Cloudflare Dashboard**
   - Visit [dash.cloudflare.com](https://dash.cloudflare.com)
   - Log in to your account

2. **Create a Pages Project**
   - Click on **"Workers & Pages"** in the sidebar
   - Click **"Create application"** → **"Pages"** → **"Connect to Git"**
   - Authorize Cloudflare to access your GitHub account
   - Select your repository: `astrocosmicvedawebsite`
   - Click **"Begin setup"**

3. **Configure Build Settings**
   - **Project name**: `astrocosmicvedawebsite` (or your preferred name)
   - **Production branch**: `main`
   - **Build command**: Leave empty (static site, no build needed)
   - **Build output directory**: `/` (root directory)
   - Click **"Save and Deploy"**

## Step 3: Set Environment Variables

After the first deployment:

1. **Go to your Pages project** in Cloudflare Dashboard
2. Click on **"Settings"** → **"Environment variables"**
3. Click **"Add variable"**
4. Add the following:
   - **Variable name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-proj-...`)
   - **Environment**: Select **"Production"** (and optionally "Preview" if you want it for preview deployments)
5. Click **"Save"**

## Step 4: Redeploy (Important!)

After adding the environment variable, you need to trigger a new deployment:

1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Retry deployment"** or **"Redeploy"**

Alternatively, you can push a small change to trigger a new deployment:

```bash
git commit --allow-empty -m "Trigger redeploy for env vars"
git push origin main
```

## Step 5: Verify It Works

1. Visit your Cloudflare Pages URL (e.g., `https://your-project.pages.dev`)
2. Generate a birth chart
3. Open the chatbot and ask a question
4. It should now use ChatGPT to answer!

## How It Works

- **Cloudflare Pages** hosts your static files (HTML, CSS, JS)
- **Cloudflare Pages Functions** (in the `functions/` folder) handle the `/api/chat` endpoint
- The function calls OpenAI's API using your API key from environment variables
- Your frontend code in `script.js` calls `/api/chat` which automatically routes to the function

## Troubleshooting

### Chatbot not working?

1. **Check environment variable**: Make sure `OPENAI_API_KEY` is set in Cloudflare Pages settings
2. **Check browser console**: Open DevTools (F12) → Console tab → Look for errors
3. **Check function logs**: In Cloudflare Dashboard → Your Pages project → "Functions" tab → View logs
4. **Verify API key**: Make sure your OpenAI API key is valid and has credits

### CORS errors?

The function already includes CORS headers. If you still see CORS errors, check that the function is deployed correctly.

### Function not found?

- Make sure `functions/api/chat.js` exists in your repository
- The file structure must be exactly: `functions/api/chat.js`
- Redeploy after adding the function file

## Cost Considerations

- **Cloudflare Pages**: Free (up to 500 builds/month, unlimited requests)
- **Cloudflare Functions**: Free (100,000 requests/day on free tier)
- **OpenAI API**: Pay-as-you-go (very cheap, ~$0.15 per 1M tokens for gpt-4o-mini)

## Security Notes

- ✅ Your OpenAI API key is stored securely in Cloudflare's environment variables
- ✅ The key is never exposed to the frontend
- ✅ API calls go through Cloudflare's infrastructure
- ⚠️ Make sure your `.env` file is in `.gitignore` (already done)

## Next Steps

Once deployed, your website will be live at:
- Production: `https://your-project.pages.dev`
- You can add a custom domain in Cloudflare Pages settings

Enjoy your live astrology website with ChatGPT integration! 🔮✨

