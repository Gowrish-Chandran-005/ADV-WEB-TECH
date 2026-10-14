import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { createDefaultAuthDependencies, type AuthDependencies } from './modules/auth/auth.dependencies';
import { createAuthRouter } from './modules/auth/auth.router';
import { createUsersRouter } from './modules/auth/users.router';
import {
  createCategoriesRouter,
  createEquipmentRouter,
  createMyEquipmentRouter,
} from './modules/equipment/equipment.router';
import {
  createFavoriteEquipmentRouter,
  createUserFavoritesRouter,
} from './modules/equipment/favorites.router';
import { equipmentRepository } from './modules/equipment/equipment.repository';
import type { EquipmentRepository } from './modules/equipment/equipment.types';
import { bookingRepository } from './modules/bookings/booking.repository';
import {
  createBookingRouter,
  createEquipmentBookingRouter,
} from './modules/bookings/booking.router';
import type { BookingRepository } from './modules/bookings/booking.types';
import { createNotificationsRouter } from './modules/notifications/notifications.router';
import { postgresNotificationsRepository } from './modules/notifications/notifications.repository';
import type { NotificationsRepository } from './modules/notifications/notifications.types';
import { createWantedRouter } from './modules/wanted/wanted.router';
import { wantedService as defaultWantedService, WantedService } from './modules/wanted/wanted.service';
import { createUploadRouter, UPLOADS_DIR } from './modules/upload/upload.router';
import {
  createBookingDisputesRouter,
  createDamageClaimsRouter,
  createComplaintsRouter,
} from './modules/disputes/disputes.router';
import {
  disputesService as defaultDisputesService,
  DisputesService,
} from './modules/disputes/disputes.service';
import {
  createEquipmentReviewsRouter,
  createBookingReviewsRouter,
} from './modules/reviews/reviews.router';
import { reviewsRepository as defaultReviewsRepository } from './modules/reviews/reviews.repository';
import type { ReviewsRepository } from './modules/reviews/reviews.types';

export type DatabaseHealthCheck = () => Promise<void>;

export function createApp(
  databaseHealthCheck: DatabaseHealthCheck = checkDatabaseConnection,
  authDependencies: AuthDependencies = createDefaultAuthDependencies(),
  equipmentDependencies: EquipmentRepository = equipmentRepository,
  bookingDependencies: BookingRepository = bookingRepository,
  wantedDependencies: WantedService = defaultWantedService,
  notificationDependencies: NotificationsRepository = postgresNotificationsRepository,
  disputesDependencies: DisputesService = defaultDisputesService,
  reviewsDependencies: ReviewsRepository = defaultReviewsRepository,
): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use(express.json({ limit: '1mb' }));


  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.get('/api/health/db', async (_request, response) => {
    try {
      await databaseHealthCheck();
      response.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
      console.error('Database health check failed:', error);
      response.status(503).json({
        status: 'error',
        database: 'unavailable',
      });
    }
  });

  app.use('/api/v1/auth', createAuthRouter(authDependencies));
  app.use('/api/v1/users', createUsersRouter(authDependencies));
  app.use('/api/v1/categories', createCategoriesRouter(equipmentDependencies));
  app.use('/api/v1/equipment', createEquipmentRouter(authDependencies, equipmentDependencies));
  app.use('/api/v1/equipment', createFavoriteEquipmentRouter(authDependencies, equipmentDependencies));
  app.use('/api/v1/users', createMyEquipmentRouter(authDependencies, equipmentDependencies));
  app.use('/api/v1/users', createUserFavoritesRouter(authDependencies, equipmentDependencies));
  app.use('/api/v1/bookings', createBookingRouter(authDependencies, bookingDependencies));
  app.use('/api/v1/equipment', createEquipmentBookingRouter(authDependencies, bookingDependencies));
  app.use('/api/v1/equipment', createEquipmentReviewsRouter(authDependencies, reviewsDependencies));
  app.use('/api/v1/bookings', createBookingReviewsRouter(authDependencies, reviewsDependencies));
  app.use('/api/v1/wanted', createWantedRouter(authDependencies, wantedDependencies));
  app.use('/api/v1/notifications', createNotificationsRouter(authDependencies, notificationDependencies));
  app.use('/api/v1/uploads', createUploadRouter(authDependencies));
  app.use('/api/v1/bookings', createBookingDisputesRouter(authDependencies, disputesDependencies));
  app.use('/api/v1/damage-claims', createDamageClaimsRouter(authDependencies, disputesDependencies));
  app.use('/api/v1/complaints', createComplaintsRouter(authDependencies, disputesDependencies));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
