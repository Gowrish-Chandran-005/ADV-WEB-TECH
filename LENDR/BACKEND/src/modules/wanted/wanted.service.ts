import { postgresNotificationsRepository } from '../notifications/notifications.repository';
import type { NotificationsRepository } from '../notifications/notifications.types';
import { postgresWantedRepository } from './wanted.repository';
import type {
  CreateOfferInput,
  CreateWantedRequestInput,
  RespondOfferInput,
  UpdateWantedRequestInput,
  WantedFilterOptions,
  WantedRepository,
} from './wanted.types';

export class WantedService {
  constructor(
    private readonly wantedRepo: WantedRepository = postgresWantedRepository,
    private readonly notificationsRepo: NotificationsRepository = postgresNotificationsRepository,
  ) {}

  async createRequest(userId: string, input: CreateWantedRequestInput) {
    const request = await this.wantedRepo.createRequest(userId, input);

    // Asynchronously or inline trigger matching & notifications
    try {
      const matches = await this.wantedRepo.findMatchesForRequest(request.id);
      const notifiedOwners = new Set<string>();

      for (const match of matches) {
        if (match.ownerUserId === userId || notifiedOwners.has(match.ownerUserId)) {
          continue;
        }

        const alreadyNotified = await this.notificationsRepo.hasMatchNotification(
          match.ownerUserId,
          request.id,
        );

        if (!alreadyNotified) {
          notifiedOwners.add(match.ownerUserId);
          await this.notificationsRepo.create({
            userId: match.ownerUserId,
            type: 'WANTED_MATCH',
            title: 'Gear Match for Your Listing',
            body: `A classmate posted a wanted note matching your "${match.title}".`,
            metadata: {
              wantedRequestId: request.id,
              equipmentId: match.id,
              requestTitle: request.title,
            },
          });
        }
      }
    } catch (err) {
      // Notification errors should not fail request creation
      console.error('Error generating wanted match notifications:', err);
    }

    return request;
  }

  async getRequestById(id: string) {
    return this.wantedRepo.getRequestById(id);
  }

  async listRequests(filters: WantedFilterOptions) {
    return this.wantedRepo.listRequests(filters);
  }

  async updateRequest(id: string, userId: string, input: UpdateWantedRequestInput) {
    return this.wantedRepo.updateRequest(id, userId, input);
  }

  async withdrawRequest(id: string, userId: string) {
    return this.wantedRepo.withdrawRequest(id, userId);
  }

  async getOffersForRequest(requestId: string) {
    return this.wantedRepo.getOffersForRequest(requestId);
  }

  async findMatchesForRequest(requestId: string) {
    return this.wantedRepo.findMatchesForRequest(requestId);
  }

  async createOffer(offererUserId: string, requestId: string, input: CreateOfferInput) {
    const result = await this.wantedRepo.createOffer(offererUserId, requestId, input);
    if (typeof result === 'string') {
      return result;
    }

    // Notify the request author
    try {
      await this.notificationsRepo.create({
        userId: result.request.userId,
        type: 'WANTED_OFFER_RECEIVED',
        title: 'New Gear Offer Received',
        body: `${result.offer.offererName} offered "${result.offer.equipmentTitle}" for your wanted note.`,
        metadata: {
          wantedRequestId: result.request.id,
          offerId: result.offer.id,
          equipmentId: result.offer.equipmentId,
        },
      });
    } catch (err) {
      console.error('Failed to send offer notification:', err);
    }

    return result.offer;
  }

  async respondToOffer(authorUserId: string, offerId: string, input: RespondOfferInput) {
    const result = await this.wantedRepo.respondToOffer(authorUserId, offerId, input);
    if (typeof result === 'string') {
      return result;
    }

    // Send notification to offerer
    try {
      if (input.action === 'accept') {
        await this.notificationsRepo.create({
          userId: result.offer.offererUserId,
          type: 'WANTED_OFFER_ACCEPTED',
          title: 'Your Gear Offer Was Accepted!',
          body: `Your offer for "${result.offer.equipmentTitle}" was accepted for "${result.request.title}".`,
          metadata: {
            wantedRequestId: result.request.id,
            offerId: result.offer.id,
            equipmentId: result.offer.equipmentId,
          },
        });
      } else {
        await this.notificationsRepo.create({
          userId: result.offer.offererUserId,
          type: 'WANTED_OFFER_DECLINED',
          title: 'Gear Offer Status Update',
          body: `Your offer for "${result.offer.equipmentTitle}" on "${result.request.title}" was declined.`,
          metadata: {
            wantedRequestId: result.request.id,
            offerId: result.offer.id,
          },
        });
      }
    } catch (err) {
      console.error('Failed to send offer response notification:', err);
    }

    return result.offer;
  }
}

export const wantedService = new WantedService();
