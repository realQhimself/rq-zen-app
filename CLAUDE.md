# Zen App (禅 Space)

A mobile-first meditation & mindfulness practice app with pixel art aesthetics.

## Stack
- React 19 + Vite 7 + React Router 7
- Tailwind CSS 4 (theme in `src/index.css` under `@theme`)
- Framer Motion (page transitions, micro-animations)
- Lucide React (icons)
- PWA via vite-plugin-pwa
- Deployed to GitHub Pages (`gh-pages` branch)

## Project Structure
```
src/
  App.jsx          — Router + bottom navigation
  index.css        — Tailwind theme, all CSS animations
  pages/
    Home.jsx       — Profile, ranks, habits, dailies, todos
    Meditation.jsx — Breathing guide with BGM
    Fish.jsx       — Instrument simulator (muyu, bowl, drum)
    Garden.jsx     — Mini-game: monk movement, NPC interactions, item placement
    Sutra.jsx      — Heart Sutra character-by-character copying
public/
  audio/           — All sound files (.mp3, .m4a, .wav)
  images/          — Background PNGs and pixel art sprites
    garden/        — Monk sprites, placeable item sprites
```

## Key Conventions

### Routing
- Base path: `/zen-app/` (GitHub Pages deployment)
- Use `import.meta.env.BASE_URL` for all asset paths
- Navigation links use React Router's `useNavigate()`

### Styling
- Custom theme colors: `zen-bg`, `zen-ink`, `zen-red`, `zen-dark`, `zen-sand`, `zen-stone`, `zen-gold`, `zen-moss`, `zen-cloud`
- Font: Noto Serif SC (loaded from Google Fonts)
- Frosted glass cards: use `.zen-card` class
- All custom animations go in `src/index.css`, not inline
- Mobile-first: use `env(safe-area-inset-bottom)` for bottom spacing

### State / Persistence
- All user data lives in `localStorage` (no backend)
  - `zen_profile` — { totalXP, spentXP } (unified XP/merit economy)
  - `zen_garden` — { cycleStartDate, checkIns[], items[] }
  - `zen_monk_pos` — { x, y }
  - `zen_garden_muted` — boolean
- XP helpers (`readProfile`, `addXP`, `spendXP`, `refundXP`) are defined in Garden.jsx

### Audio
- Audio files go in `public/audio/`
- Use `new Audio()` for BGM, audio element pools for rapid-fire sounds
- Always respect mute state; save mute preference to localStorage
- BGM: `garden.mp3`, `bowl-horizon.mp3`
- SFX: `muyu-sample2.mp3` (selected muyu sound), `muyu.m4a`, `bowl.m4a`, `drum.m4a`

### Garden Page Specifics
- Fixed NPCs (Buddha statue, muyu drum) are SVG art, always present
  - Buddha → navigates to `/meditation`
  - Muyu → navigates to `/fish` (plays sound on tap)
- Placeable items are pixel art sprites, cost XP, stored in garden state
- Monk movement: WASD/arrows on desktop, virtual joystick on mobile
- Proximity detection radius: 12 units (items), 15 units (NPCs)

## Language
- UI text is in Chinese (Simplified)
- Code comments and variable names in English

## GitHub
- Repo: `realQhimself/zen-app`
- Primary branch: `main`
- Deploy: `npm run deploy` (builds + pushes to gh-pages)

## Workflow Preferences
- Commit after each completed feature, not in bulk
- Test changes visually in browser before committing
- Keep components in single files (no splitting until truly necessary)
- Prefer CSS animations over JS animations where possible
- No unnecessary abstractions — direct, readable code
