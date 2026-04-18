# POS Frontend Client

A highly interactive touch-optimized React Single Page Application handling the robust requirements of T-Shirt production ordering pipelines and inventory stock.

## Ecosystem
- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS Headless UI + HeroIcons
- **State Management:** Zustand (for global offline/online sync logic integration), React Query (for cache normalization across modules).
- **Validation:** React Hook Form bound with Zod schemas strictly synchronized with Backend payload expectations.

## Commands
- `npm run dev`: Run locally via Vite with Hot Module Replacement on Port 5173.
- `npm run build`: Orchestrates the TS compiler and passes bundle to Vite. Vite handles code splitting (vendor chunks isolated separately preventing cascading cache invalidations when simply modifying your application code).
- `npm run preview`: Used entirely to visualize the strict `.dist` folder as though running Nginx natively on local boundaries.

## Configuration Warning for Production
Always ensure you swap the local default definitions inside your target `.env` configurations specifically targeting **Clerk Publishable Keys** mapping effectively with your mapped cloud domain. Missing these drops the users into locked out loop boundaries immediately resolving application blockades.

Our production builds employ `esbuild` plugins automatically slicing out console hooks and debugging triggers making your bundled payload clean natively without extra configurations.
