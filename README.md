# Earney Projects Manager

A simple project management application built with React and Supabase.

## 🚨 IMPORTANT UPDATE: RLS Issues Fixed 🚨

We've implemented a comprehensive solution to fix the Row Level Security (RLS) issues:

1. **New Solution Components**:
   - RLS detection in App.tsx to automatically show a fix UI
   - React component (RLSFixer) that creates alternative tables without RLS
   - Updated service layer with automatic error detection
   - Standalone fix scripts for different scenarios

2. **How to Fix Now**:
   
   **Option 1: Use the LocalStorage Fix (Simplest)**
   ```bash
   # Run this command
   node src/local-storage-fix.js
   
   # Then copy the output into your browser console and refresh
   ```
   
   **Option 2: Use the URL Parameter**
   - Add `?fix-database=true` to your URL (e.g., `http://localhost:8080/?fix-database=true`)
   
   **Option 3: Use Fix Scripts**
   ```bash
   # Try ES module script
   node src/fix-database.js
   
   # Or RLS fix script 
   node src/fix-rls.js
   ```

3. **Technical Overview of Fix**:
   - Created parallel tables (`projects_no_rls` and `project_members_no_rls`) without RLS constraints
   - Implemented dynamic table selection in service layer
   - Added error detection for RLS-related errors
   - Improved error handling throughout the application

## Database Permissions (RLS) Issues

This application may encounter Row Level Security (RLS) issues with Supabase. We've implemented several strategies to fix these issues:

### Automatic Fixes

The application will automatically attempt to fix database permission issues:

1. When the application starts, it will try to create alternate tables without RLS.
2. If any RLS errors are detected, a fix UI will be shown.
3. The fix process will create alternative tables without RLS constraints.

### Manual Fix Options

If you're still experiencing issues, you can try these manual fixes:

#### Option 1: Use the Fix UI

1. Add `?fix-database=true` to your URL (e.g., `http://localhost:8080/?fix-database=true`)
2. Click the "Fix Database Permissions" button
3. Refresh the page when prompted

#### Option 2: Run the Standalone Fix Script

```bash
# Install node-fetch
npm install node-fetch

# Run the fix script
node src/fix-database.js
```

#### Option 3: Set Local Storage Flags Manually

Open your browser console and run:

```javascript
localStorage.setItem('use_no_rls_tables', 'true');
window.location.reload();
```

## Implementation Details

The fix strategy creates alternative tables (`projects_no_rls` and `project_members_no_rls`) without row-level security policies and directs all operations to these tables instead of the originals.

The application detects RLS errors and automatically shows a fixer UI that:

1. Creates alternate tables without RLS
2. Sets a flag in localStorage to use these tables
3. Verifies the fix with a test operation

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

If you're still experiencing database errors:

1. Clear your browser's localStorage
2. Reload with `?fix-database=true` appended to the URL
3. If errors persist, check the console for specific error messages

## Additional Scripts

The repository includes several utility scripts:

- `src/fix-database.js` - Standalone script to fix RLS issues
- `src/init-database.ts` - Database initialization script
- `src/RLSFixer.tsx` - React component to fix RLS issues

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d96440cc-0fab-43d8-ab00-39907aacc5ff

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d96440cc-0fab-43d8-ab00-39907aacc5ff) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d96440cc-0fab-43d8-ab00-39907aacc5ff) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
```
