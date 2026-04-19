import { Router } from 'express';

import { authorize } from '../middleware/authorize';
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

// removed redundant middleware

// Org
settingsRouter.get('/org', authorize('settings:view'), getOrgHandler);
settingsRouter.patch('/org', authorize('settings:edit'), updateOrgHandler);

// Users
settingsRouter.get('/users', authorize('users:view'), getUsersHandler);
settingsRouter.post('/users/invite', authorize('users:invite'), inviteUserHandler);
settingsRouter.patch('/users/:id', authorize('users:edit'), updateUserHandler);
settingsRouter.delete('/users/:id', authorize('users:remove'), removeUserHandler);

// Notifications
settingsRouter.get('/notifications', authorize('settings:view'), getNotificationsHandler);
settingsRouter.patch('/notifications', authorize('settings:edit'), updateNotificationsHandler);

// Profile (any authenticated user can update their own profile)
settingsRouter.patch('/profile', updateProfileHandler);
