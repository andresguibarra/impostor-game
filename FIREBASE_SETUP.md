# Firebase Hosting Setup Guide

This guide will help you deploy the Impostor Game to Firebase Hosting.

## Prerequisites

- A Google account
- Access to the GitHub repository settings

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `impostor-game` (or your preferred name)
4. Disable Google Analytics (optional, not needed for hosting)
5. Click "Create project"

## Step 2: Set Up Firebase Hosting

1. In your Firebase project dashboard, click on "Hosting" in the left sidebar
2. Click "Get started"
3. You don't need to install Firebase CLI or initialize locally - the project is already configured

## Step 3: Generate Firebase Service Account

1. In the Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Navigate to the "Service accounts" tab
4. Click "Generate new private key"
5. Click "Generate key" in the confirmation dialog
6. A JSON file will be downloaded - **save this file securely**

## Step 4: Add GitHub Secret

1. Go to your GitHub repository: `https://github.com/andresguibarra/impostor-game`
2. Click on "Settings" tab
3. In the left sidebar, expand "Secrets and variables" and click "Actions"
4. Click "New repository secret"
5. Name: `FIREBASE_SERVICE_ACCOUNT`
6. Value: Open the downloaded JSON file and copy **all** of its contents, then paste it here
7. Click "Add secret"

## Step 5: Verify Existing Secrets

Make sure these secrets are already configured (they should be from the previous GitHub Pages setup):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If they're missing, add them following the same process as step 4.

## Step 6: Deploy

The deployment is now automatic! When you push to the `main` branch:

1. GitHub Actions will automatically run the deployment workflow
2. It will build your Vue app with the Supabase environment variables
3. It will deploy to Firebase Hosting
4. Your site will be live at: `https://impostor-game.web.app` (or your custom domain)

## Manual Deployment (Optional)

If you want to deploy manually from your local machine:

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build the project
yarn build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Viewing Your Site

After the first successful deployment:

1. Go to Firebase Console → Hosting
2. You'll see your site URL (something like `https://impostor-game.web.app`)
3. Click on the URL to view your deployed application

## Custom Domain (Optional)

To use a custom domain:

1. In Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the instructions to verify domain ownership
4. Configure DNS records as instructed

## Monitoring Deployments

- View deployment history in Firebase Console → Hosting
- View GitHub Actions workflow runs in GitHub → Actions tab
- Each push to `main` will trigger a new deployment

## Troubleshooting

### Deployment fails with "Permission denied"
- Verify the `FIREBASE_SERVICE_ACCOUNT` secret contains the complete JSON from the service account key
- Make sure the JSON is properly formatted

### Site shows 404 or doesn't load
- Check Firebase Console → Hosting to see if deployment was successful
- Verify the `dist` folder was created during the build step
- Check GitHub Actions logs for any build errors

### Environment variables not working
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets are set in GitHub
- Secret names must match exactly (case-sensitive)

## Project Configuration Files

The following files configure Firebase Hosting:

- `firebase.json` - Firebase Hosting configuration
  - Sets `dist` as the public directory
  - Configures SPA routing (all routes → index.html)
  - Sets cache headers for static assets

- `.firebaserc` - Firebase project configuration
  - Specifies the default Firebase project

- `.github/workflows/deploy.yml` - GitHub Actions workflow
  - Builds and deploys on push to main branch
  - Uses Firebase Hosting deploy action

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [GitHub Actions for Firebase](https://github.com/marketplace/actions/deploy-to-firebase-hosting)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
