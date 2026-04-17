import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import {
  getOrgHandler,
  updateOrgHandler,
  getUsersHandler,
  inviteUserHandler,
  updateUserHandler,
  removeUserHandler,
  getNotificationsHandler,
  updateNotificationsHandler,
  updateProfileHandler,
} from '../controllers/settingsController';

export const settingsRouter = Router();

settingsRouter.use(requireAuth, injectTenant);

// Org
settingsRouter.get('/org', getOrgHandler);
settingsRouter.patch('/org', updateOrgHandler);

// Users
settingsRouter.get('/users', getUsersHandler);
settingsRouter.post('/users/invite', inviteUserHandler);
settingsRouter.patch('/users/:id', updateUserHandler);
settingsRouter.delete('/users/:id', removeUserHandler);

// Notifications
settingsRouter.get('/notifications', getNotificationsHandler);
settingsRouter.patch('/notifications', updateNotificationsHandler);

// Profile
settingsRouter.patch('/profile', updateProfileHandler);
