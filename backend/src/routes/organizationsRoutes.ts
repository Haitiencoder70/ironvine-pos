import { Router } from 'express';
import { checkSlugAvailability, createOrganization, findMine } from '../controllers/organizationController';

// ─── Public signup endpoints (no injectTenant — org doesn't exist yet) ────────
// Mounted after clerkAuth so we can read auth.userId, but before injectTenant.
export const organizationsRouter = Router();

organizationsRouter.get('/mine',       findMine);
organizationsRouter.get('/slug-check', checkSlugAvailability);
organizationsRouter.post('/',          createOrganization);
