# Health And Fitness Tracker

A responsive React + Vite fitness dashboard based on the supplied design references.

## Features
- Track date, calorie intake, calories burned, and a meal/exercise description.
- Add, edit, and delete daily health records.
- Save records to browser `localStorage` using the required `healthAndFitness` key.
- Weekly bar chart showing only the last seven days.
- Overall intake/burned pie chart visible even before data is added.
- Responsive desktop, tablet, and mobile layouts.

## Run locally
Requires Node.js 18 or later.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build
```bash
npm run build
npm run preview
```

## Deployment
Deploy this Vite project to Netlify or Vercel. For Netlify, use:
- Build command: `npm run build`
- Publish directory: `dist`

After deployment, create `submit.txt` in the project root and put only the deployed URL in it. Run the assessment script from the assessment environment as instructed by your assignment.
