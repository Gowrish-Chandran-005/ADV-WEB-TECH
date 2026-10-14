import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  wantedApi,
  notificationsApi,
  uploadApi,
  conditionReportsApi,
  damageClaimsApi,
  complaintsApi,
  favoritesApi,
  maintenanceApi,
  reviewsApi,
  bookingsApi,
  paymentsApi,
  usersApi,
  equipmentApi,
  ApiError,
  type ApiWantedRequest,
  type ApiMatchedEquipmentItem,
  type ApiBooking,
  type ApiMaintenanceBlock,
  type ApiPaymentRecord,
} from './api';
import {
  adaptWantedRequestToPost,
  adaptMatchedItemToGearItem,
  adaptEquipmentToGearItem,
  adaptBookingToRequest,
  formatTimeAgo,
} from './adapters';

describe('Frontend Wanted & Notifications API Client', () => {
  const originalFetch = globalThis.fetch;
  let lastFetchUrl = '';
  let lastFetchOptions: RequestInit | undefined = undefined;

  const storage: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    key: (i: number) => Object.keys(storage)[i] ?? null,
    length: 0,
  } as Storage;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    lastFetchUrl = '';
    lastFetchOptions = undefined;
  });

  function mockFetch(responseBody: unknown, status = 200, headers: Record<string, string> = {}) {
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      lastFetchUrl = String(url);
      lastFetchOptions = options;
      return {
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers({ 'Content-Type': 'application/json', ...headers }),
        json: async () => responseBody,
      } as Response;
    }) as typeof fetch;
  }

  // 1. Query parameter serialization and pagination
  it('serializes wantedApi.list query parameters and pagination correctly', async () => {
    mockFetch({
      items: [],
      pagination: { page: 2, pageSize: 15, total: 0, totalPages: 0 },
    });

    const res = await wantedApi.list({
      page: 2,
      pageSize: 15,
      q: 'gimbal',
      category: 'cameras',
      status: 'OPEN',
      urgency: 'HIGH',
      sort: 'urgent',
    });

    assert.equal(res.pagination.page, 2);
    assert.match(lastFetchUrl, /\/api\/v1\/wanted\?/);
    assert.match(lastFetchUrl, /page=2/);
    assert.match(lastFetchUrl, /pageSize=15/);
    assert.match(lastFetchUrl, /q=gimbal/);
    assert.match(lastFetchUrl, /category=cameras/);
    assert.match(lastFetchUrl, /status=OPEN/);
    assert.match(lastFetchUrl, /urgency=HIGH/);
    assert.match(lastFetchUrl, /sort=urgent/);
  });

  // 2. Create, update, and withdraw payloads
  it('sends correct method and JSON body for wanted request CRUD', async () => {
    // Create
    mockFetch({ request: { id: 'w-1', title: 'Need Tripod' } }, 201);
    const created = await wantedApi.create({
      title: 'Need Tripod',
      description: 'Sturdy tripod for camera',
      startDate: '2026-10-25',
      endDate: '2026-10-27',
      urgency: 'HIGH',
    });
    assert.equal(created.request.id, 'w-1');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.match(String(lastFetchOptions?.body), /Need Tripod/);

    // Update
    mockFetch({ request: { id: 'w-1', title: 'Updated Title' } });
    const updated = await wantedApi.update('w-1', { title: 'Updated Title' });
    assert.equal(updated.request.title, 'Updated Title');
    assert.equal(lastFetchOptions?.method, 'PATCH');
    assert.equal(lastFetchUrl, '/api/v1/wanted/w-1');

    // Withdraw
    mockFetch({ status: 'withdrawn' });
    const withdrawn = await wantedApi.withdraw('w-1');
    assert.equal(withdrawn.status, 'withdrawn');
    assert.equal(lastFetchOptions?.method, 'DELETE');
    assert.equal(lastFetchUrl, '/api/v1/wanted/w-1');
  });

  // 3. Matches and offers
  it('handles getMatches, createOffer, and respondOffer', async () => {
    // Matches
    mockFetch({ items: [{ id: 'eq-1', title: 'Sony Tripod', matchReasons: ['Category match'] }] });
    const matches = await wantedApi.getMatches('w-1');
    assert.equal(matches.items.length, 1);
    assert.equal(lastFetchUrl, '/api/v1/wanted/w-1/matches');

    // Create Offer
    mockFetch({ offer: { id: 'off-1', status: 'PENDING' } }, 201);
    const offer = await wantedApi.createOffer('w-1', {
      equipmentId: 'eq-1',
      message: 'I have this ready',
    });
    assert.equal(offer.offer.id, 'off-1');
    assert.equal(lastFetchUrl, '/api/v1/wanted/w-1/offers');
    assert.equal(lastFetchOptions?.method, 'POST');

    // Respond Offer
    mockFetch({ offer: { id: 'off-1', status: 'ACCEPTED' } });
    const response = await wantedApi.respondOffer('off-1', { action: 'accept' });
    assert.equal(response.offer.status, 'ACCEPTED');
    assert.equal(lastFetchUrl, '/api/v1/wanted/offers/off-1/respond');
    assert.equal(lastFetchOptions?.method, 'POST');
  });

  // 4. Notifications API
  it('handles notification listing, mark-read, and read-all', async () => {
    // List
    mockFetch({
      items: [{ id: 'n-1', type: 'WANTED_MATCH', title: 'Match found', unread: true }],
      unreadCount: 1,
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const notifs = await notificationsApi.list({ page: 1 });
    assert.equal(notifs.unreadCount, 1);
    assert.equal(lastFetchUrl, '/api/v1/notifications?page=1');

    // Mark single as read
    mockFetch({ notification: { id: 'n-1', readAt: new Date().toISOString() } });
    const read = await notificationsApi.markAsRead('n-1');
    assert.ok(read.notification.readAt);
    assert.equal(lastFetchUrl, '/api/v1/notifications/n-1/read');
    assert.equal(lastFetchOptions?.method, 'PATCH');

    // Mark all as read
    mockFetch({ status: 'success', markedCount: 3 });
    const readAll = await notificationsApi.markAllAsRead();
    assert.equal(readAll.markedCount, 3);
    assert.equal(lastFetchUrl, '/api/v1/notifications/read-all');
    assert.equal(lastFetchOptions?.method, 'POST');
  });

  // 5. Auth headers and ApiError handling
  it('attaches Bearer token from localStorage and parses structured error', async () => {
    localStorage.setItem('lendr_token', 'test-jwt-token');

    mockFetch({
      error: { code: 'SELF_OFFER_NOT_ALLOWED', message: 'Cannot offer on own request.' },
    }, 403, { 'Retry-After': '30' });

    try {
      await wantedApi.createOffer('w-1', { equipmentId: 'eq-1' });
      assert.fail('Should have thrown ApiError');
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 403);
      assert.equal(err.code, 'SELF_OFFER_NOT_ALLOWED');
      assert.equal(err.message, 'Cannot offer on own request.');
      assert.equal(err.retryAfter, 30);
    }
  });

  // 6. Domain Adapters
  it('adapts ApiWantedRequest to WantedPost with safe fallbacks', () => {
    const apiRequest: ApiWantedRequest = {
      id: 'w-uuid-1',
      userId: 'u-1',
      categoryId: 'cat-1',
      categoryName: 'Cameras',
      categorySlug: 'cameras',
      title: 'Sony Alpha Wanted',
      description: 'Looking for a camera for fest shoot',
      locationBlock: 'TT Block',
      startDate: '2026-10-25',
      endDate: '2026-10-27',
      urgency: 'HIGH',
      status: 'OPEN',
      expiresAt: '2026-10-31T00:00:00.000Z',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1h ago
      updatedAt: new Date().toISOString(),
      offersCount: 2,
      author: {
        id: 'u-1',
        fullName: 'Aarav Kumar',
        initials: 'AK',
      },
    };

    const post = adaptWantedRequestToPost(apiRequest);
    assert.equal(post.id, 'w-uuid-1');
    assert.equal(post.author, 'Aarav Kumar');
    assert.equal(post.initials, 'AK');
    assert.equal(post.block, 'TT Block');
    assert.equal(post.category, 'Cameras');
    assert.equal(post.urgency, 'HIGH');
    assert.equal(post.repliesCount, 2);
    assert.equal(post.timeAgo, '1h ago');
    assert.equal(post.status, 'OPEN');

    // Test with null location and category
    const nullReq: ApiWantedRequest = {
      ...apiRequest,
      locationBlock: null,
      categoryName: null,
    };
    const nullPost = adaptWantedRequestToPost(nullReq);
    assert.equal(nullPost.location, 'Campus');
    assert.equal(nullPost.block, 'Campus');
    assert.equal(nullPost.category, 'General');
  });

  it('adapts ApiMatchedEquipmentItem to GearItem', () => {
    const matched: ApiMatchedEquipmentItem = {
      id: 'eq-match-1',
      title: 'Canon EOS R6 Kit',
      description: 'Complete mirrorless camera rig',
      categoryName: 'Cameras',
      categorySlug: 'cameras',
      dailyRentalPrice: '550.00',
      securityDeposit: '0.00',
      pickupLocation: 'SJT Ground Floor',
      condition: 'LIKE_NEW',
      imageUrls: ['https://example.com/canon.jpg'],
      ownerUserId: 'u-owner',
      matchReasons: ['Category match: Cameras', 'Available for dates'],
    };

    const gearItem = adaptMatchedItemToGearItem(matched);
    assert.equal(gearItem.id, 'eq-match-1');
    assert.equal(gearItem.title, 'Canon EOS R6 Kit');
    assert.equal(gearItem.pricePerDay, 550);
    assert.equal(gearItem.depositType, 'zero');
    assert.equal(gearItem.depositAmount, 0);
    assert.equal(gearItem.availabilityBadge, 'Available Match');
    assert.equal(gearItem.tags.length, 2);
    assert.equal(gearItem.tags[0], 'Category match: Cameras');
  });

  it('formats time ago correctly', () => {
    const now = new Date();
    assert.equal(formatTimeAgo(now.toISOString()), 'Just now');

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    assert.equal(formatTimeAgo(tenMinAgo), '10m ago');

    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    assert.equal(formatTimeAgo(twoHoursAgo), '2h ago');

    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    assert.equal(formatTimeAgo(twoDaysAgo), '2d ago');
  });

  // 9. Regression: Urgency Contract Enforcement (Phase 5.1 audit)
  it('enforces backend urgency contract: only HIGH and MEDIUM serialized to wantedApi', async () => {
    mockFetch({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });

    await wantedApi.list({ urgency: 'HIGH' });
    assert.match(lastFetchUrl, /urgency=HIGH/);

    await wantedApi.list({ urgency: 'MEDIUM' });
    assert.match(lastFetchUrl, /urgency=MEDIUM/);
  });

  // 10. Regression: Notification wantedRequestId UUID safety
  it('validates UUID format for notification wantedRequestId before navigation', () => {
    const isUuid = (id: unknown): id is string =>
      typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);

    assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isUuid('invalid-id-123'), false);
    assert.equal(isUuid(''), false);
    assert.equal(isUuid(null), false);
    assert.equal(isUuid(undefined), false);
  });

  // 11. Regression: Inclusive rental days calculation matches backend
  it('calculates inclusive rental days for booking hand-off matching backend logic', () => {
    const calcInclusiveDays = (startDate: string, endDate: string): number => {
      const startUtc = new Date(`${startDate}T00:00:00.000Z`).getTime();
      const endUtc = new Date(`${endDate}T00:00:00.000Z`).getTime();
      const diffDays = Math.floor((endUtc - startUtc) / 86_400_000);
      return Math.max(diffDays + 1, 1);
    };

    // Same day rental = 1 inclusive day
    assert.equal(calcInclusiveDays('2026-10-20', '2026-10-20'), 1);
    // 2-day rental
    assert.equal(calcInclusiveDays('2026-10-20', '2026-10-21'), 2);
    // 3-day rental
    assert.equal(calcInclusiveDays('2026-10-20', '2026-10-22'), 3);
  });

  // 12. Upload API: sends multipart FormData and bearer token
  it('sends multipart FormData and bearer token for uploadApi.uploadFile', async () => {
    localStorage.setItem('lendr_token', 'test-upload-token');
    mockFetch({
      url: '/uploads/abc.jpg',
      items: [{ url: '/uploads/abc.jpg', filename: 'abc.jpg', originalName: 'camera.jpg', size: 1024, mimeType: 'image/jpeg' }],
    }, 201);

    const mockFile = new File(['mock content'], 'camera.jpg', { type: 'image/jpeg' });
    const result = await uploadApi.uploadFile(mockFile);

    assert.equal(lastFetchUrl, '/api/v1/uploads');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.match(String((lastFetchOptions?.headers as Record<string, string>)?.Authorization), /Bearer test-upload-token/);
    assert.equal(result.url, '/uploads/abc.jpg');
    assert.equal(result.items.length, 1);
  });

  // 13. Regression: Legacy listing with empty imageUrls renders graceful fallback
  it('adapts legacy listing with empty imageUrls to fallback image and undefined galleryViews', () => {
    const legacyListing = {
      id: 'eq-legacy-1',
      ownerUserId: 'u-1',
      ownerFullName: 'Student Lender',
      organizationId: null,
      categoryId: 'cat-1',
      categoryName: 'Cameras',
      categorySlug: 'cameras',
      title: 'Vintage Film Camera',
      description: 'Used film camera without photos',
      tags: ['vintage'],
      features: ['Body only'],
      useCases: ['photography'],
      specifications: {},
      imageUrls: [],
      dailyRentalPrice: '300.00',
      securityDeposit: null,
      maxRentalDays: 14,
      pickupLocation: 'SJT Ground',
      condition: 'GOOD' as const,
      status: 'ACTIVE' as const,
      createdAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-10T00:00:00.000Z',
    };

    const adapted = adaptEquipmentToGearItem(legacyListing);
    assert.match(adapted.image, /^https?:\/\//);
    assert.deepEqual(adapted.images, []);
    assert.equal(adapted.galleryViews, undefined);
  });

  // 14. Regression: Multi-photo listing preserves cover photo order and galleryViews
  it('adapts multi-photo listing preserving cover photo order and galleryViews', () => {
    const multiPhotoListing = {
      id: 'eq-multi-1',
      ownerUserId: 'u-1',
      ownerFullName: 'Student Lender',
      organizationId: null,
      categoryId: 'cat-1',
      categoryName: 'Cameras',
      categorySlug: 'cameras',
      title: 'Sony FX3 Cinema Camera',
      description: 'Cinema line camera with 3 photos',
      tags: ['cinema', '4k'],
      features: ['FX3 Body', 'Top Handle', 'Battery'],
      useCases: ['film'],
      specifications: { sensor: 'Full-Frame' },
      imageUrls: [
        '/uploads/cover-uuid.jpg',
        '/uploads/angle2-uuid.jpg',
        '/uploads/angle3-uuid.jpg',
      ],
      dailyRentalPrice: '900.00',
      securityDeposit: '1000.00',
      maxRentalDays: 7,
      pickupLocation: 'TT Foodys',
      condition: 'LIKE_NEW' as const,
      status: 'ACTIVE' as const,
      createdAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-10T00:00:00.000Z',
    };

    const adapted = adaptEquipmentToGearItem(multiPhotoListing);
    assert.equal(adapted.image, '/uploads/cover-uuid.jpg');
    assert.equal(adapted.images?.length, 3);
    assert.equal(adapted.images?.[0], '/uploads/cover-uuid.jpg');
    assert.equal(adapted.images?.[1], '/uploads/angle2-uuid.jpg');
    assert.equal(adapted.images?.[2], '/uploads/angle3-uuid.jpg');
    assert.equal(adapted.galleryViews?.length, 3);
    assert.equal(adapted.galleryViews?.[0].label, 'COVER');
    assert.equal(adapted.galleryViews?.[1].label, 'VIEW 2');
    assert.equal(adapted.galleryViews?.[2].label, 'VIEW 3');
  });

  // ── Phase 6B.2: Condition Reports, Damage Claims & Grievances ─────────────────

  it('submits condition report with milestone, rating, notes, and photos', async () => {
    localStorage.setItem('lendr_token', 'test-token');
    mockFetch({
      conditionReport: {
        id: 'cr-100',
        bookingId: 'book-1',
        reporterId: 'u-1',
        reportType: 'HANDOVER',
        condition: 'LIKE_NEW',
        notes: 'Handover executed at SJT portico; optics spotless.',
        evidenceUrls: ['/uploads/handover.jpg'],
        createdAt: '2026-10-10T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z',
      },
    }, 201);

    const res = await conditionReportsApi.create('book-1', {
      reportType: 'HANDOVER',
      condition: 'LIKE_NEW',
      notes: 'Handover executed at SJT portico; optics spotless.',
      evidenceUrls: ['/uploads/handover.jpg'],
    });

    assert.equal(lastFetchUrl, '/api/v1/bookings/book-1/condition-reports');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.match(String((lastFetchOptions?.headers as any)?.Authorization), /Bearer test-token/);
    const body = JSON.parse(String(lastFetchOptions?.body));
    assert.equal(body.reportType, 'HANDOVER');
    assert.equal(body.condition, 'LIKE_NEW');
    assert.equal(body.evidenceUrls[0], '/uploads/handover.jpg');
    assert.equal(res.conditionReport.id, 'cr-100');
  });

  it('lender files damage claim with proposed fine and photographic evidence', async () => {
    localStorage.setItem('lendr_token', 'test-lender-token');
    mockFetch({
      damageClaim: {
        id: 'claim-100',
        bookingId: 'book-1',
        description: 'Deep scratch on the front optic glass',
        status: 'AWAITING_BORROWER_RESPONSE',
        evidenceUrls: ['/uploads/scratch.jpg'],
        proposedFineAmount: '450.00',
        fineExplanation: 'Protective UV filter replacement cost',
        borrowerResponse: null,
        borrowerDisputed: false,
        borrowerEvidenceUrls: [],
        borrowerRespondedAt: null,
        createdAt: '2026-10-10T12:00:00.000Z',
        updatedAt: '2026-10-10T12:00:00.000Z',
      },
    }, 201);

    const res = await damageClaimsApi.create('book-1', {
      description: 'Deep scratch on the front optic glass',
      evidenceUrls: ['/uploads/scratch.jpg'],
      proposedFineAmount: 450,
      fineExplanation: 'Protective UV filter replacement cost',
    });

    assert.equal(lastFetchUrl, '/api/v1/bookings/book-1/damage-claims');
    const body = JSON.parse(String(lastFetchOptions?.body));
    assert.equal(body.description, 'Deep scratch on the front optic glass');
    assert.equal(body.proposedFineAmount, 450);
    assert.equal(res.damageClaim.status, 'AWAITING_BORROWER_RESPONSE');
    assert.equal(res.damageClaim.proposedFineAmount, '450.00');
  });

  it('handles CLAIM_WINDOW_EXPIRED error gracefully without silent failure', async () => {
    mockFetch(
      {
        error: {
          code: 'CLAIM_WINDOW_EXPIRED',
          message: 'The 24-hour return inspection window has expired.',
        },
      },
      422,
    );

    await assert.rejects(
      async () => {
        await damageClaimsApi.create('book-late', {
          description: 'Discovered scratch late',
          evidenceUrls: ['/uploads/late.jpg'],
        });
      },
      (err: any) => {
        assert(err instanceof ApiError);
        assert.equal(err.status, 422);
        assert.equal(err.code, 'CLAIM_WINDOW_EXPIRED');
        assert.match(err.message, /24-hour return inspection window has expired/);
        return true;
      },
    );
  });

  it('borrower submits counter-statement, dispute flag, and counter-evidence', async () => {
    localStorage.setItem('lendr_token', 'test-borrower-token');
    mockFetch({
      damageClaim: {
        id: 'claim-100',
        bookingId: 'book-1',
        status: 'UNDER_REVIEW',
        borrowerResponse: 'Optics scratch was pre-existing at SJT handover.',
        borrowerDisputed: true,
        borrowerEvidenceUrls: ['/uploads/handover_checkout.jpg'],
        borrowerRespondedAt: '2026-10-10T14:00:00.000Z',
      },
    }, 200);

    const res = await damageClaimsApi.respond('claim-100', {
      response: 'Optics scratch was pre-existing at SJT handover.',
      disputed: true,
      evidenceUrls: ['/uploads/handover_checkout.jpg'],
    });

    assert.equal(lastFetchUrl, '/api/v1/damage-claims/claim-100/respond');
    const body = JSON.parse(String(lastFetchOptions?.body));
    assert.equal(body.disputed, true);
    assert.equal(body.response, 'Optics scratch was pre-existing at SJT handover.');
    assert.equal(res.damageClaim.status, 'UNDER_REVIEW');
    assert.equal(res.damageClaim.borrowerDisputed, true);
  });

  it('admin resolves dispute with determination, approved fine, and notes', async () => {
    mockFetch({
      damageClaim: {
        id: 'claim-100',
        status: 'RESOLVED',
        finalApprovedFine: '200.00',
        adminDecisionNotes: '50% wear split agreed after reviewing handover photo timestamps.',
      },
    }, 200);

    const res = await damageClaimsApi.adminResolve('claim-100', {
      decision: 'RESOLVED',
      finalApprovedFine: 200,
      notes: '50% wear split agreed after reviewing handover photo timestamps.',
    });

    assert.equal(lastFetchUrl, '/api/v1/damage-claims/claim-100/admin-resolve');
    const body = JSON.parse(String(lastFetchOptions?.body));
    assert.equal(body.decision, 'RESOLVED');
    assert.equal(body.finalApprovedFine, 200);
    assert.equal(res.damageClaim.status, 'RESOLVED');
  });

  it('admin reopens dispute with mandatory documented justification', async () => {
    mockFetch({
      damageClaim: {
        id: 'claim-100',
        status: 'UNDER_REVIEW',
        reopenedReason: 'Lender was hospitalized during 24h window; medical proof provided.',
      },
    }, 200);

    const res = await damageClaimsApi.adminReopen('claim-100', {
      reason: 'Lender was hospitalized during 24h window; medical proof provided.',
    });

    assert.equal(lastFetchUrl, '/api/v1/damage-claims/claim-100/admin-reopen');
    const body = JSON.parse(String(lastFetchOptions?.body));
    assert.match(body.reason, /hospitalized/);
    assert.equal(res.damageClaim.status, 'UNDER_REVIEW');
  });

  it('student files campus grievance/complaint and retrieves history', async () => {
    mockFetch({
      complaint: {
        id: 'comp-1',
        bookingId: 'book-1',
        category: 'Equipment Malfunction',
        description: 'Gimbal motor overheated during shoot in MB hall.',
        evidenceUrls: ['/uploads/motor.jpg'],
        status: 'OPEN',
        createdAt: '2026-10-10T12:00:00.000Z',
        updatedAt: '2026-10-10T12:00:00.000Z',
      },
    }, 201);

    const created = await complaintsApi.create({
      bookingId: 'book-1',
      category: 'Equipment Malfunction',
      description: 'Gimbal motor overheated during shoot in MB hall.',
      evidenceUrls: ['/uploads/motor.jpg'],
    });

    assert.equal(lastFetchUrl, '/api/v1/complaints');
    assert.equal(created.complaint.id, 'comp-1');

    mockFetch({
      items: [created.complaint],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const list = await complaintsApi.myComplaints();
    assert.equal(lastFetchUrl, '/api/v1/complaints/me');
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0].category, 'Equipment Malfunction');
  });

  it('preserves returnRecordedAt, ownerUserId, and renterId when adapting bookings for dispute role check', () => {
    const rawBooking: ApiBooking = {
      id: 'b-999',
      equipmentId: 'eq-1',
      equipmentTitle: 'Sony FX3',
      equipmentStatus: 'ACTIVE',
      renterId: 'user-renter-uuid',
      renterFullName: 'Borrower Student',
      ownerUserId: 'user-lender-uuid',
      organizationId: null,
      startAt: '2026-10-10T00:00:00.000Z',
      endAt: '2026-10-12T00:00:00.000Z',
      status: 'RETURN_REQUESTED',
      rentalDays: 2,
      dailyRentalPrice: '500.00',
      securityDeposit: '1000.00',
      totalPrice: '1000.00',
      notes: 'Shoot in SJT',
      expiresAt: '2026-10-13T00:00:00.000Z',
      returnRecordedAt: '2026-10-12T18:00:00.000Z',
      createdAt: '2026-10-09T00:00:00.000Z',
      updatedAt: '2026-10-12T18:00:00.000Z',
    };

    const adapted = adaptBookingToRequest(rawBooking, '/uploads/fx3.jpg');
    assert.equal(adapted.id, 'b-999');
    assert.equal(adapted.ownerUserId, 'user-lender-uuid');
    assert.equal(adapted.renterId, 'user-renter-uuid');
    assert.equal(adapted.returnRecordedAt, '2026-10-12T18:00:00.000Z');
    assert.equal(adapted.status, 'return_requested');
  });

  it('favoritesApi.addFavorite sends POST /equipment/:id/favorite with Bearer token', async () => {
    localStorage.setItem('lendr_token', 'vit-student-jwt-token');
    mockFetch({ favorited: true }, 200);

    const res = await favoritesApi.addFavorite('eq-uuid-1234');
    assert.equal(res.favorited, true);
    assert.equal(lastFetchUrl, '/api/v1/equipment/eq-uuid-1234/favorite');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer vit-student-jwt-token',
    );
  });

  it('favoritesApi.removeFavorite sends DELETE /equipment/:id/favorite with Bearer token', async () => {
    localStorage.setItem('lendr_token', 'vit-student-jwt-token');
    mockFetch(null, 204);

    await favoritesApi.removeFavorite('eq-uuid-1234');
    assert.equal(lastFetchUrl, '/api/v1/equipment/eq-uuid-1234/favorite');
    assert.equal(lastFetchOptions?.method, 'DELETE');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer vit-student-jwt-token',
    );
  });

  it('favoritesApi.myFavorites queries /users/me/favorites with pagination params', async () => {
    localStorage.setItem('lendr_token', 'vit-student-jwt-token');
    const mockPagedResult = {
      items: [
        {
          id: 'eq-uuid-1',
          ownerId: 'owner-uuid',
          categoryId: 'cat-uuid',
          categoryName: 'Cameras',
          title: 'Sony FX3 Cinema',
          condition: 'LIKE_NEW',
          dailyRentalPrice: '500.00',
          depositAmount: '0.00',
          imageUrls: ['/uploads/cam1.jpg'],
          status: 'ACTIVE',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    };
    mockFetch(mockPagedResult, 200);

    const res = await favoritesApi.myFavorites({ page: 1, pageSize: 50 });
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].id, 'eq-uuid-1');
    assert.equal(lastFetchUrl, '/api/v1/users/me/favorites?page=1&pageSize=50');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer vit-student-jwt-token',
    );
  });

  it('favoritesApi handles 401 unauthenticated and 403 forbidden cleanly with ApiError', async () => {
    localStorage.removeItem('lendr_token');
    mockFetch({ code: 'UNAUTHENTICATED', message: 'Token is missing or expired.' }, 401);

    await assert.rejects(
      async () => {
        await favoritesApi.addFavorite('eq-uuid-1234');
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'UNAUTHENTICATED');
        return true;
      },
    );

    mockFetch({ code: 'ROLE_UNAUTHORIZED', message: 'Only students can access this endpoint.' }, 403);
    await assert.rejects(
      async () => {
        await favoritesApi.myFavorites();
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.code, 'ROLE_UNAUTHORIZED');
        return true;
      },
    );
  });

  it('maintenanceApi.list fetches maintenance blocks for equipment', async () => {
    const mockBlocks: { items: ApiMaintenanceBlock[] } = {
      items: [
        {
          id: 'mb-uuid-1',
          equipmentId: 'eq-uuid-100',
          startAt: '2026-10-20T00:00:00.000Z',
          endAt: '2026-10-22T00:00:00.000Z',
          reason: 'Sensor overhaul and lens calibration',
          createdByUserId: 'owner-uuid',
          createdAt: '2026-10-14T00:00:00.000Z',
          updatedAt: '2026-10-14T00:00:00.000Z',
        },
      ],
    };
    mockFetch(mockBlocks, 200);

    const res = await maintenanceApi.list('eq-uuid-100');
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].id, 'mb-uuid-1');
    assert.equal(res.items[0].reason, 'Sensor overhaul and lens calibration');
    assert.equal(lastFetchUrl, '/api/v1/equipment/eq-uuid-100/maintenance');
  });

  it('maintenanceApi.create sends POST /equipment/:id/maintenance with valid payload and Bearer token', async () => {
    localStorage.setItem('lendr_token', 'owner-jwt-token');
    const mockCreated = {
      maintenance: {
        id: 'mb-uuid-2',
        equipmentId: 'eq-uuid-100',
        startAt: '2026-10-25T00:00:00.000Z',
        endAt: '2026-10-27T00:00:00.000Z',
        reason: 'Club hackathon reservation hold',
        createdByUserId: 'owner-uuid',
        createdAt: '2026-10-14T10:00:00.000Z',
        updatedAt: '2026-10-14T10:00:00.000Z',
      },
    };
    mockFetch(mockCreated, 201);

    const res = await maintenanceApi.create('eq-uuid-100', {
      startDate: '2026-10-25',
      endDate: '2026-10-26',
      reason: 'Club hackathon reservation hold',
    });

    assert.equal(res.maintenance.id, 'mb-uuid-2');
    assert.equal(lastFetchUrl, '/api/v1/equipment/eq-uuid-100/maintenance');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer owner-jwt-token',
    );
    assert.deepEqual(JSON.parse(lastFetchOptions?.body as string), {
      startDate: '2026-10-25',
      endDate: '2026-10-26',
      reason: 'Club hackathon reservation hold',
    });
  });

  it('maintenanceApi.delete sends DELETE /equipment/:id/maintenance/:blockId with Bearer token', async () => {
    localStorage.setItem('lendr_token', 'owner-jwt-token');
    mockFetch(null, 204);

    await maintenanceApi.delete('eq-uuid-100', 'mb-uuid-2');
    assert.equal(lastFetchUrl, '/api/v1/equipment/eq-uuid-100/maintenance/mb-uuid-2');
    assert.equal(lastFetchOptions?.method, 'DELETE');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer owner-jwt-token',
    );
  });

  it('maintenanceApi handles 403 Forbidden for non-owner and 400 for invalid date range', async () => {
    localStorage.setItem('lendr_token', 'non-owner-token');
    mockFetch(
      { code: 'FORBIDDEN', message: 'You are not authorized to manage this listing.' },
      403,
    );

    await assert.rejects(
      async () => {
        await maintenanceApi.create('eq-uuid-100', {
          startDate: '2026-10-25',
          endDate: '2026-10-26',
          reason: 'Unauthorized attempt',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      },
    );

    mockFetch(
      { code: 'VALIDATION_ERROR', message: 'endDate must be on or after startDate.' },
      400,
    );

    await assert.rejects(
      async () => {
        await maintenanceApi.create('eq-uuid-100', {
          startDate: '2026-10-28',
          endDate: '2026-10-25',
          reason: 'Inverted date range',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.code, 'VALIDATION_ERROR');
        return true;
      },
    );
  });

  it('maintenanceApi handles 409 BOOKING_CONFLICT and 409 MAINTENANCE_CONFLICT cleanly', async () => {
    localStorage.setItem('lendr_token', 'owner-jwt-token');
    mockFetch(
      { code: 'BOOKING_CONFLICT', message: 'Maintenance cannot overlap a blocking booking.' },
      409,
    );

    await assert.rejects(
      async () => {
        await maintenanceApi.create('eq-uuid-100', {
          startDate: '2026-10-20',
          endDate: '2026-10-22',
          reason: 'Overlap booking',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'BOOKING_CONFLICT');
        return true;
      },
    );

    mockFetch(
      { code: 'MAINTENANCE_CONFLICT', message: 'The maintenance period overlaps another block.' },
      409,
    );

    await assert.rejects(
      async () => {
        await maintenanceApi.create('eq-uuid-100', {
          startDate: '2026-10-20',
          endDate: '2026-10-22',
          reason: 'Overlap maintenance',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'MAINTENANCE_CONFLICT');
        return true;
      },
    );
  });

  // ── Phase 7.3: Reviews & Ratings ──────────────────────────────────────────

  it('reviewsApi.listForEquipment fetches equipment reviews, distribution, and eligibleBookingId', async () => {
    localStorage.removeItem('lendr_token');
    mockFetch({
      items: [
        {
          id: 'rev-1',
          rating: 5,
          comment: 'Perfect condition, lender was prompt at SJT.',
          createdAt: '2026-10-12T10:00:00.000Z',
          reviewerName: 'Gowrish Chandran',
          reviewerInitials: 'GC',
        },
      ],
      averageRating: 5.0,
      reviewCount: 1,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
      eligibleBookingId: 'booking-uuid-777',
    });

    const res = await reviewsApi.listForEquipment('eq-uuid-100');
    assert.equal(lastFetchUrl, '/api/v1/equipment/eq-uuid-100/reviews');
    assert.equal(res.reviewCount, 1);
    assert.equal(res.averageRating, 5.0);
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].reviewerName, 'Gowrish Chandran');
    assert.equal(res.items[0].reviewerInitials, 'GC');
    assert.equal(res.eligibleBookingId, 'booking-uuid-777');
  });

  it('reviewsApi.createForEquipment sends POST /equipment/:id/reviews with Bearer token', async () => {
    localStorage.setItem('lendr_token', 'jwt-student-token');
    mockFetch(
      {
        review: {
          id: 'rev-2',
          rating: 4,
          comment: 'Smooth rental experience.',
          createdAt: '2026-10-14T12:00:00.000Z',
          reviewerName: 'Gowrish Chandran',
          reviewerInitials: 'GC',
        },
      },
      201,
    );

    const res = await reviewsApi.createForEquipment('eq-uuid-100', {
      bookingId: 'booking-uuid-777',
      rating: 4,
      comment: 'Smooth rental experience.',
    });

    assert.equal(lastFetchUrl, '/api/v1/equipment/eq-uuid-100/reviews');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer jwt-student-token',
    );
    const body = JSON.parse(lastFetchOptions?.body as string);
    assert.equal(body.bookingId, 'booking-uuid-777');
    assert.equal(body.rating, 4);
    assert.equal(body.comment, 'Smooth rental experience.');
    assert.equal(res.review.id, 'rev-2');
    assert.equal(res.review.rating, 4);
  });

  it('reviewsApi.createForBooking sends POST /bookings/:id/reviews with Bearer token', async () => {
    localStorage.setItem('lendr_token', 'jwt-student-token');
    mockFetch(
      {
        review: {
          id: 'rev-3',
          rating: 5,
          comment: 'Flawless handoff at TT Library lawn.',
          createdAt: '2026-10-14T12:00:00.000Z',
          reviewerName: 'Priya Sharma',
          reviewerInitials: 'PS',
        },
      },
      201,
    );

    const res = await reviewsApi.createForBooking('booking-uuid-888', {
      rating: 5,
      comment: 'Flawless handoff at TT Library lawn.',
    });

    assert.equal(lastFetchUrl, '/api/v1/bookings/booking-uuid-888/reviews');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer jwt-student-token',
    );
    const body = JSON.parse(lastFetchOptions?.body as string);
    assert.equal(body.rating, 5);
    assert.equal(body.comment, 'Flawless handoff at TT Library lawn.');
    assert.equal(res.review.reviewerInitials, 'PS');
  });

  it('reviewsApi handles 403 Forbidden, 409 Conflict, and 422 Unprocessable cleanly with ApiError', async () => {
    localStorage.setItem('lendr_token', 'jwt-token');

    mockFetch(
      { code: 'BOOKING_NOT_COMPLETED', message: 'Reviews can only be submitted for completed bookings.' },
      422,
    );
    await assert.rejects(
      async () => {
        await reviewsApi.createForBooking('booking-active', { rating: 5 });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 422);
        assert.equal(err.code, 'BOOKING_NOT_COMPLETED');
        return true;
      },
    );

    mockFetch(
      { code: 'REVIEW_ALREADY_EXISTS', message: 'A review has already been submitted for this booking.' },
      409,
    );
    await assert.rejects(
      async () => {
        await reviewsApi.createForBooking('booking-reviewed', { rating: 5 });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'REVIEW_ALREADY_EXISTS');
        return true;
      },
    );

    mockFetch(
      { code: 'FORBIDDEN', message: 'Owners cannot review their own equipment.' },
      403,
    );
    await assert.rejects(
      async () => {
        await reviewsApi.createForBooking('booking-owner', { rating: 5 });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      },
    );
  });

  it('paymentsApi.pay sends POST /bookings/:id/pay with Bearer token and simulation flag', async () => {
    localStorage.setItem('lendr_token', 'mock-token-xyz');
    const mockPayment: ApiPaymentRecord = {
      id: 'pay-uuid-1',
      bookingId: 'booking-uuid-1',
      payerId: 'user-uuid-1',
      amount: '750.00',
      currency: 'INR',
      status: 'SUCCESS',
      provider: 'MOCK_PG',
      providerReference: 'MOCK-TXN-12345678',
      metadata: {},
      createdAt: '2026-10-14T12:00:00.000Z',
      updatedAt: '2026-10-14T12:00:00.000Z',
    };
    const mockBooking: ApiBooking = {
      id: 'booking-uuid-1',
      equipmentId: 'eq-1',
      equipmentTitle: 'Sony A7 IV',
      equipmentStatus: 'ACTIVE',
      renterId: 'user-uuid-1',
      renterFullName: 'Aarav Sharma',
      ownerUserId: 'owner-uuid-1',
      organizationId: null,
      startAt: '2026-10-20T00:00:00.000Z',
      endAt: '2026-10-23T00:00:00.000Z',
      rentalDays: 3,
      dailyRentalPrice: '250.00',
      totalPrice: '750.00',
      securityDeposit: '500.00',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      notes: null,
      expiresAt: '2026-10-20T00:00:00.000Z',
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T12:00:00.000Z',
    };

    mockFetch({ payment: mockPayment, booking: mockBooking, alreadyPaid: false }, 200);

    const res = await paymentsApi.pay('booking-uuid-1', 'SUCCESS');

    assert.equal(lastFetchUrl, '/api/v1/bookings/booking-uuid-1/pay');
    const authHeader = (lastFetchOptions?.headers as Record<string, string>)?.Authorization;
    assert.equal(authHeader, 'Bearer mock-token-xyz');
    const body = JSON.parse(String(lastFetchOptions?.body));
    assert.equal(body.action, 'SUCCESS');
    assert.equal(res.payment.status, 'SUCCESS');
    assert.equal(res.booking.paymentStatus, 'PAID');
    assert.equal(res.alreadyPaid, false);
  });

  it('paymentsApi.pay handles simulated failure correctly', async () => {
    localStorage.setItem('lendr_token', 'mock-token-xyz');
    const mockPayment: ApiPaymentRecord = {
      id: 'pay-uuid-fail',
      bookingId: 'booking-uuid-2',
      payerId: 'user-uuid-1',
      amount: '500.00',
      currency: 'INR',
      status: 'FAILED',
      provider: 'MOCK_PG',
      providerReference: null,
      metadata: {},
      createdAt: '2026-10-14T12:00:00.000Z',
      updatedAt: '2026-10-14T12:00:00.000Z',
    };
    const mockBooking: ApiBooking = {
      id: 'booking-uuid-2',
      equipmentId: 'eq-2',
      equipmentTitle: 'Rode Wireless GO II',
      equipmentStatus: 'ACTIVE',
      renterId: 'user-uuid-1',
      renterFullName: 'Aarav Sharma',
      ownerUserId: 'owner-uuid-1',
      organizationId: null,
      startAt: '2026-10-20T00:00:00.000Z',
      endAt: '2026-10-23T00:00:00.000Z',
      rentalDays: 3,
      dailyRentalPrice: '166.67',
      totalPrice: '500.00',
      securityDeposit: '0.00',
      status: 'APPROVED',
      paymentStatus: 'FAILED',
      notes: null,
      expiresAt: '2026-10-20T00:00:00.000Z',
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T12:00:00.000Z',
    };

    mockFetch({ payment: mockPayment, booking: mockBooking, alreadyPaid: false }, 200);

    const res = await paymentsApi.pay('booking-uuid-2', 'FAIL');

    assert.equal(lastFetchUrl, '/api/v1/bookings/booking-uuid-2/pay');
    const body = JSON.parse(String(lastFetchOptions?.body));
    assert.equal(body.action, 'FAIL');
    assert.equal(res.payment.status, 'FAILED');
    assert.equal(res.booking.paymentStatus, 'FAILED');
  });

  it('paymentsApi.pay throws ApiError on 409 BOOKING_NOT_APPROVED and 403 FORBIDDEN', async () => {
    mockFetch(
      { code: 'BOOKING_NOT_APPROVED', message: 'Payment can only be processed after owner approval.' },
      409,
    );

    await assert.rejects(
      async () => {
        await paymentsApi.pay('booking-pending', 'SUCCESS');
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'BOOKING_NOT_APPROVED');
        return true;
      },
    );

    mockFetch(
      { code: 'FORBIDDEN', message: 'Only the renter can pay for this booking.' },
      403,
    );

    await assert.rejects(
      async () => {
        await paymentsApi.pay('booking-other-renter', 'SUCCESS');
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      },
    );
  });

  it('paymentsApi.listForBooking fetches payment audit records', async () => {
    localStorage.setItem('lendr_token', 'mock-token-xyz');
    const mockPayments: ApiPaymentRecord[] = [
      {
        id: 'pay-1',
        bookingId: 'booking-1',
        payerId: 'user-1',
        amount: '1200.00',
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'MOCK_PG',
        providerReference: 'MOCK-TXN-ABC',
        metadata: {},
        createdAt: '2026-10-14T12:00:00.000Z',
        updatedAt: '2026-10-14T12:00:00.000Z',
      },
    ];

    mockFetch({ items: mockPayments }, 200);

    const res = await paymentsApi.listForBooking('booking-1');
    assert.equal(lastFetchUrl, '/api/v1/bookings/booking-1/payments');
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].providerReference, 'MOCK-TXN-ABC');
  });

  it('bookingsApi.pay delegates to paymentsApi.pay', async () => {
    mockFetch({
      payment: {
        id: 'pay-123',
        bookingId: 'booking-abc',
        payerId: 'user-1',
        amount: '800.00',
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'MOCK_PG',
        providerReference: 'MOCK-TXN-999',
        metadata: {},
        createdAt: '2026-10-14T12:00:00.000Z',
        updatedAt: '2026-10-14T12:00:00.000Z',
      },
      booking: {
        id: 'booking-abc',
        equipmentId: 'eq-1',
        equipmentTitle: 'GoPro Hero 12',
        equipmentStatus: 'ACTIVE',
        renterId: 'user-1',
        renterFullName: 'Aarav Sharma',
        ownerUserId: 'owner-uuid-1',
        organizationId: null,
        startAt: '2026-10-25T00:00:00.000Z',
        endAt: '2026-10-27T00:00:00.000Z',
        rentalDays: 2,
        dailyRentalPrice: '400.00',
        totalPrice: '800.00',
        securityDeposit: '0.00',
        status: 'APPROVED',
        paymentStatus: 'PAID',
        notes: null,
        expiresAt: '2026-10-25T00:00:00.000Z',
        createdAt: '2026-10-14T10:00:00.000Z',
        updatedAt: '2026-10-14T12:00:00.000Z',
      },
      alreadyPaid: false,
    }, 200);

    const res = await bookingsApi.pay('booking-abc', { action: 'SUCCESS' });
    assert.equal(res.payment.id, 'pay-123');
    assert.equal(res.booking.paymentStatus, 'PAID');
  });

  it('adaptBookingToRequest maps paymentStatus accurately with lowercase conversion', () => {
    const rawApiBooking: ApiBooking = {
      id: 'b-status-check',
      equipmentId: 'eq-1',
      equipmentTitle: '4K Projector',
      equipmentStatus: 'ACTIVE',
      renterId: 'renter-1',
      renterFullName: 'Aarav Sharma',
      ownerUserId: 'owner-2',
      organizationId: null,
      startAt: '2026-10-25T00:00:00.000Z',
      endAt: '2026-10-27T00:00:00.000Z',
      rentalDays: 2,
      dailyRentalPrice: '600.00',
      totalPrice: '1500.00',
      securityDeposit: '300.00',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      notes: 'Need for hackathon pitch',
      expiresAt: '2026-10-25T00:00:00.000Z',
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T12:00:00.000Z',
    };

    const adapted = adaptBookingToRequest(rawApiBooking);
    assert.equal(adapted.paymentStatus, 'paid');
    assert.equal(adapted.status, 'approved');
    assert.equal(adapted.totalAmount, 1500);

    // Unpaid fallback
    const rawUnpaid: ApiBooking = {
      ...rawApiBooking,
      paymentStatus: 'UNPAID',
    };
    assert.equal(adaptBookingToRequest(rawUnpaid).paymentStatus, 'unpaid');

    // Failed fallback
    const rawFailed: ApiBooking = {
      ...rawApiBooking,
      paymentStatus: 'FAILED',
    };
    assert.equal(adaptBookingToRequest(rawFailed).paymentStatus, 'failed');
  });

  // 42. Student Profile & My Gear Hub Endpoints
  it('updates profile via usersApi.updateProfile with PATCH to /users/me', async () => {
    mockFetch({
      user: {
        id: 'u-1',
        fullName: 'Aarav Sharma Updated',
        registrationNumber: '21BCE1042',
        phone: '9876543210',
      },
    });

    const res = await usersApi.updateProfile({
      fullName: 'Aarav Sharma Updated',
      registrationNumber: '21BCE1042',
      phone: '9876543210',
    });

    assert.equal(res.user.fullName, 'Aarav Sharma Updated');
    assert.equal(res.user.registrationNumber, '21BCE1042');
    assert.match(lastFetchUrl, /\/api\/v1\/users\/me$/);
    assert.equal(lastFetchOptions?.method, 'PATCH');
    const body = JSON.parse(lastFetchOptions?.body as string);
    assert.equal(body.fullName, 'Aarav Sharma Updated');
    assert.equal(body.registrationNumber, '21BCE1042');
    assert.equal(body.phone, '9876543210');
  });

  it('fetches student payments via paymentsApi.myPayments', async () => {
    mockFetch({
      items: [
        {
          id: 'pay-1',
          bookingId: 'b-1',
          amount: '1200.00',
          status: 'SUCCESS',
          equipmentTitle: 'Sony FX3',
        },
      ],
    });

    const res = await paymentsApi.myPayments();
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].equipmentTitle, 'Sony FX3');
    assert.match(lastFetchUrl, /\/api\/v1\/users\/me\/payments$/);
  });

  it('fetches student wanted requests with offers via wantedApi.myRequests', async () => {
    mockFetch({
      items: [
        {
          id: 'w-1',
          title: 'Need Gimbal',
          status: 'OPEN',
          offers: [
            { id: 'off-1', equipmentTitle: 'Ronin RS3', status: 'PENDING' },
          ],
        },
      ],
    });

    const res = await wantedApi.myRequests();
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].offers.length, 1);
    assert.equal(res.items[0].offers[0].equipmentTitle, 'Ronin RS3');
    assert.match(lastFetchUrl, /\/api\/v1\/wanted\/my\/requests$/);
  });

  it('fetches student sent offers via wantedApi.myOffers', async () => {
    mockFetch({
      items: [
        {
          id: 'off-2',
          wantedRequestTitle: 'Need Sony A7 IV',
          equipmentTitle: 'Sony A7 IV Body',
          status: 'ACCEPTED',
        },
      ],
    });

    const res = await wantedApi.myOffers();
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].equipmentTitle, 'Sony A7 IV Body');
    assert.match(lastFetchUrl, /\/api\/v1\/wanted\/my\/offers$/);
  });

  it('equipmentApi.browse constructs search query with q parameter correctly', async () => {
    mockFetch({
      items: [
        {
          id: 'eq-cam-1',
          title: 'Sony Alpha FX3 Cinema Camera',
          categoryId: 'cat-cameras',
          categoryName: 'Cameras',
          categorySlug: 'cameras',
          description: 'Full-frame cinema line camera',
          dailyRentalPrice: '1200.00',
          tags: ['cinema', '4k'],
          features: ['4K 120fps'],
          useCases: ['filmmaking'],
          specifications: { brand: 'Sony' },
          imageUrls: ['/uploads/fx3.jpg'],
          status: 'ACTIVE',
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });

    const res = await equipmentApi.browse({ q: 'Sony Alpha', pageSize: 50, sort: 'newest' });
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].title, 'Sony Alpha FX3 Cinema Camera');
    assert.match(lastFetchUrl, /\/api\/v1\/equipment\?/);
    assert.match(lastFetchUrl, /q=Sony\+Alpha/);
    assert.match(lastFetchUrl, /pageSize=50/);
    assert.match(lastFetchUrl, /sort=newest/);
  });

  it('equipmentApi.browse handles full filter set alongside search query', async () => {
    mockFetch({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    await equipmentApi.browse({
      q: 'Arduino',
      category: 'makers',
      minPrice: 50,
      maxPrice: 500,
      sort: 'price_asc',
    });

    assert.match(lastFetchUrl, /q=Arduino/);
    assert.match(lastFetchUrl, /category=makers/);
    assert.match(lastFetchUrl, /minPrice=50/);
    assert.match(lastFetchUrl, /maxPrice=500/);
    assert.match(lastFetchUrl, /sort=price_asc/);
  });

  it('equipmentApi.browse without q omits search parameter from URL', async () => {
    mockFetch({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    await equipmentApi.browse({ pageSize: 20 });
    assert.ok(!lastFetchUrl.includes('q='));
    assert.match(lastFetchUrl, /pageSize=20/);
  });

  // 43. Two-Way Trust Reviews & Lifecycle APIs
  it('bookingsApi.start calls /bookings/:id/start via POST with auth header', async () => {
    localStorage.setItem('lendr_token', 'test-owner-token');
    mockFetch({ booking: { id: 'b-start-1', status: 'ACTIVE' } });

    const res = await bookingsApi.start('b-start-1');
    assert.equal(res.booking.id, 'b-start-1');
    assert.equal(res.booking.status, 'ACTIVE');
    assert.equal(lastFetchUrl, '/api/v1/bookings/b-start-1/start');
    assert.equal(lastFetchOptions?.method, 'POST');
    assert.equal(
      (lastFetchOptions?.headers as Record<string, string>)?.Authorization,
      'Bearer test-owner-token',
    );
  });

  it('reviewsApi.getForBooking fetches double-blind review summary', async () => {
    mockFetch({
      bookingId: 'b-rev-1',
      status: 'COMPLETED',
      canReview: false,
      myRole: 'renter',
      myDirection: 'RENTER_TO_OWNER',
      myReview: { id: 'r-1', rating: 5, comment: 'Super!', status: 'PENDING_REVEAL', isRevealed: false },
      partnerReview: { status: 'PENDING_REVEAL', isRevealed: false },
    });

    const summary = await reviewsApi.getForBooking('b-rev-1');
    assert.equal(summary.bookingId, 'b-rev-1');
    assert.equal(summary.canReview, false);
    assert.equal(summary.myRole, 'renter');
    assert.equal(summary.partnerReview?.isRevealed, false);
    assert.equal(lastFetchUrl, '/api/v1/bookings/b-rev-1/reviews');
  });

  it('reviewsApi.getUserReputation fetches separated owner and renter reputation metrics', async () => {
    mockFetch({
      userId: 'u-target-1',
      ownerReputation: { averageRating: 4.8, reviewCount: 5, completedRentals: 6, reviews: [] },
      renterReputation: { averageRating: 5.0, reviewCount: 2, completedRentals: 2, reviews: [] },
    });

    const rep = await reviewsApi.getUserReputation('u-target-1');
    assert.equal(rep.userId, 'u-target-1');
    assert.equal(rep.ownerReputation.averageRating, 4.8);
    assert.equal(rep.renterReputation.averageRating, 5.0);
    assert.equal(lastFetchUrl, '/api/v1/users/u-target-1/reputation');
  });

  it('reviewsApi.getMyReputation calls /users/me/reputation', async () => {
    mockFetch({
      userId: 'u-me-1',
      ownerReputation: { averageRating: null, reviewCount: 0, completedRentals: 0, reviews: [] },
      renterReputation: { averageRating: 4.5, reviewCount: 4, completedRentals: 5, reviews: [] },
    });

    const rep = await reviewsApi.getMyReputation();
    assert.equal(rep.userId, 'u-me-1');
    assert.equal(rep.ownerReputation.averageRating, null);
    assert.equal(rep.renterReputation.reviewCount, 4);
    assert.equal(lastFetchUrl, '/api/v1/users/me/reputation');
  });
});



