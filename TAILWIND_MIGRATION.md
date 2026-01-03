# TailwindCSS Migration Guide

## Installation Steps

### 1. Install TailwindCSS and Dependencies

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
```

### 2. Files Created/Modified

#### Created:

- `tailwind.config.js` - Tailwind configuration with dark mode support
- `TAILWIND_MIGRATION.md` - This guide

#### Modified:

- `apps/dashboard/src/styles.css` - Replaced custom CSS with Tailwind directives
- `apps/dashboard/src/app/features/auth/login/login.component.html` - Converted to Tailwind classes
- `apps/dashboard/src/app/features/auth/login/login.component.ts` - Removed `styleUrls`
- `apps/dashboard/src/app/features/dashboard/dashboard.component.html` - Need to convert (see below)
- `apps/dashboard/src/app/features/dashboard/dashboard.component.ts` - Need to remove `styleUrls`

#### To Delete:

- `apps/dashboard/src/app/features/auth/login/login.component.css` - No longer needed
- `apps/dashboard/src/app/features/dashboard/dashboard.component.css` - No longer needed (after conversion)

## What's Changed

### Login Component ✅

- Converted all custom CSS classes to Tailwind utility classes
- Gradient background: `bg-gradient-to-br from-indigo-600 to-purple-600`
- Card styling: `bg-white dark:bg-slate-800 rounded-2xl shadow-2xl`
- Form inputs: Tailwind form classes with dark mode support
- Responsive design maintained

### Dashboard Component (TODO)

The dashboard component is large and needs conversion. Key areas:

- Header with user info and theme toggle
- Kanban board columns (TODO, IN_PROGRESS, DONE)
- Task cards with drag-drop
- Modals (create/edit task, keyboard shortcuts, audit log)
- Filters and sorting controls

## Dark Mode

Dark mode is configured in `tailwind.config.js`:

```javascript
darkMode: 'class'
```

The app toggles dark mode by adding/removing the `dark` class on the `<body>` element.
All Tailwind classes support dark mode with the `dark:` prefix.

## Testing

After installation, test the application:

```bash
# Start the dashboard
npm run start:dashboard

# Visit http://localhost:4200
# Test login page styling
# Test dark mode toggle
```

## Next Steps

1. Run `npm install -D tailwindcss postcss autoprefixer`
2. The `tailwind.config.js` is already created
3. Test the login page
4. Convert the dashboard component (large task - can be done incrementally)
5. Delete old CSS files once conversion is complete

## Benefits

- Smaller bundle size (unused CSS is purged)
- Consistent design system
- Better dark mode support
- Faster development with utility classes
- No need to maintain custom CSS files
