import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import { currentIstDate } from '../modules/bookings/booking.validation';

export interface WantedSeedItem {
  title: string;
  categorySlug: string;
  authorEmail: string;
  authorFallbackName: string;
  authorRegNumber: string;
  description: string;
  locationBlock: string;
  startOffsetDays: number;
  durationDays: number;
  urgency: 'HIGH' | 'MEDIUM';
}

export const DEMO_WANTED_REQUESTS: WantedSeedItem[] = [
  {
    title: 'Mirrorless camera for a student short film',
    categorySlug: 'cameras',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Need a capable 4K mirrorless camera (Sony A7 / Canon R series or similar) with a standard zoom lens for a 2-day student short film shoot for the campus film society. Handover preferred at SJT or TT.',
    locationBlock: 'SJT Block Gate 2',
    startOffsetDays: 2,
    durationDays: 2,
    urgency: 'HIGH',
  },
  {
    title: 'Wireless microphone kit for documentary assignment',
    categorySlug: 'audio',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Seeking a dual-channel wireless lapel mic set (Røde Wireless GO / DJI Mic or equivalent) with USB-C / 3.5mm receiver for campus interview recording and documentary coursework.',
    locationBlock: 'Technology Tower (TT) Foodys',
    startOffsetDays: 1,
    durationDays: 2,
    urgency: 'HIGH',
  },
  {
    title: 'Tripod with fluid head for video shoot',
    categorySlug: 'cameras',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Looking for a heavy-duty video tripod with smooth pan/tilt fluid head to capture stable cinematic tracking shots for our Riviera cultural team promo video.',
    locationBlock: 'Main Building (MB) Lawn',
    startOffsetDays: 2,
    durationDays: 1,
    urgency: 'MEDIUM',
  },
  {
    title: 'Arduino and sensor kit for IoT prototype',
    categorySlug: 'project-kits',
    authorEmail: 'meera@vitstudent.ac.in',
    authorFallbackName: 'Meera K.',
    authorRegNumber: '21BCE0412',
    description: '[DEMO] Need an Arduino Uno or Mega starter kit with assorted sensors (ultrasonic, DHT11, PIR, relay module, breadboard and jumper wires) for a semester IoT lab project.',
    locationBlock: "Men's Hostel Block D",
    startOffsetDays: 3,
    durationDays: 4,
    urgency: 'MEDIUM',
  },
  {
    title: 'Portable projector for club presentation',
    categorySlug: 'event-equipment',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Looking for a bright portable HDMI projector (at least 1080p / 2500+ lumens) for an evening student club workshop and design presentation.',
    locationBlock: 'GDN Library Block Entrance',
    startOffsetDays: 1,
    durationDays: 1,
    urgency: 'HIGH',
  },
  {
    title: 'Performance laptop for 4K video editing',
    categorySlug: 'computing',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Need a powerful laptop (Apple Silicon MacBook or RTX-equipped Windows machine with Premiere / DaVinci Resolve) to edit and color grade a short film over the weekend.',
    locationBlock: "Ladies' Hostel Block E Gazebo",
    startOffsetDays: 3,
    durationDays: 2,
    urgency: 'HIGH',
  },
  {
    title: 'LED video light kit with softbox',
    categorySlug: 'lighting',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Need 1-2 portable continuous LED video lights (Aputure / Godox / Nanlite) with light stands and softbox diffusion for indoor portrait and night interview scenes.',
    locationBlock: 'SJT Ground Reception',
    startOffsetDays: 2,
    durationDays: 2,
    urgency: 'MEDIUM',
  },
  {
    title: 'Soldering station and digital multimeter for hardware work',
    categorySlug: 'tools',
    authorEmail: 'meera@vitstudent.ac.in',
    authorFallbackName: 'Meera K.',
    authorRegNumber: '21BCE0412',
    description: '[DEMO] In need of a temperature-controlled soldering iron station, solder lead, brass sponge, and a reliable digital multimeter for PCB assembly and hardware debugging.',
    locationBlock: 'Technology Tower (TT) Ground Floor',
    startOffsetDays: 1,
    durationDays: 3,
    urgency: 'MEDIUM',
  },
  {
    title: 'Portable speaker and wireless microphone for club event',
    categorySlug: 'audio',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Need a battery-powered portable PA speaker or loud Bluetooth sound system with a wireless mic for an outdoor club gathering and acoustic jam session.',
    locationBlock: 'Outdoor Amphitheater / Gazebo',
    startOffsetDays: 2,
    durationDays: 1,
    urgency: 'HIGH',
  },
  {
    title: 'Graphics drawing tablet for UI/UX assignment',
    categorySlug: 'computing',
    authorEmail: 'aarav@vitstudent.ac.in',
    authorFallbackName: 'Aarav K.',
    authorRegNumber: '21BCE1492',
    description: '[DEMO] Looking for a pressure-sensitive graphics tablet (Wacom One / Intuos or XP-Pen) with stylus for digital illustration and Figma wireframing design assignment.',
    locationBlock: "Men's Hostel Block L",
    startOffsetDays: 1,
    durationDays: 4,
    urgency: 'MEDIUM',
  },
];

function addDaysToDate(baseDateStr: string, days: number): string {
  const d = new Date(`${baseDateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function seedWantedRequests(): Promise<{
  insertedCount: number;
  updatedCount: number;
  totalDemoRequests: number;
  records: { id: string; title: string; category: string; author: string }[];
}> {
  if (!pool) {
    throw new Error('Database pool connection is not configured.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch categories mapping
    const catsRes = await client.query<{ id: string; slug: string }>('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(catsRes.rows.map((c) => [c.slug, c.id]));

    // 2. Ensure author users exist
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
    const userMap: Record<string, string> = {};

    const usersRes = await client.query<{ id: string; email: string }>('SELECT id, email FROM users');
    for (const u of usersRes.rows) {
      userMap[u.email] = u.id;
    }

    // Ensure Aarav and Meera exist if missing
    for (const demoReq of DEMO_WANTED_REQUESTS) {
      if (!userMap[demoReq.authorEmail]) {
        const insertUser = await client.query<{ id: string }>(
          `INSERT INTO users (email, password_hash, full_name, registration_number, phone, role, status)
           VALUES ($1, $2, $3, $4, '+91 98402 12345', 'STUDENT', 'ACTIVE')
           ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id`,
          [demoReq.authorEmail, defaultPasswordHash, demoReq.authorFallbackName, demoReq.authorRegNumber],
        );
        userMap[demoReq.authorEmail] = insertUser.rows[0].id;
      }
    }

    const todayIST = currentIstDate();
    let insertedCount = 0;
    let updatedCount = 0;
    const records: { id: string; title: string; category: string; author: string }[] = [];

    // 3. Upsert each demo request idempotently
    for (const item of DEMO_WANTED_REQUESTS) {
      const authorId = userMap[item.authorEmail];
      const categoryId = catMap[item.categorySlug] ?? null;
      const startDate = addDaysToDate(todayIST, item.startOffsetDays);
      const endDate = addDaysToDate(startDate, item.durationDays);

      // Check if this demo request already exists by exact title
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM wanted_requests WHERE title = $1',
        [item.title],
      );

      if (existing.rows.length > 0) {
        // Idempotent update to refresh date range and status if already present
        const reqId = existing.rows[0].id;
        await client.query(
          `UPDATE wanted_requests
           SET user_id = $1,
               category_id = $2,
               description = $3,
               location_block = $4,
               start_date = $5,
               end_date = $6,
               urgency = $7,
               status = 'OPEN',
               expires_at = CURRENT_TIMESTAMP + interval '14 days',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $8`,
          [authorId, categoryId, item.description, item.locationBlock, startDate, endDate, item.urgency, reqId],
        );
        updatedCount++;
        records.push({
          id: reqId,
          title: item.title,
          category: item.categorySlug,
          author: item.authorEmail,
        });
      } else {
        // Insert new demo request
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO wanted_requests
             (user_id, category_id, title, description, location_block, start_date, end_date, urgency, status, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN', CURRENT_TIMESTAMP + interval '14 days')
           RETURNING id`,
          [authorId, categoryId, item.title, item.description, item.locationBlock, startDate, endDate, item.urgency],
        );
        insertedCount++;
        records.push({
          id: inserted.rows[0].id,
          title: item.title,
          category: item.categorySlug,
          author: item.authorEmail,
        });
      }
    }

    await client.query('COMMIT');

    const totalRes = await client.query<{ count: string }>(
      "SELECT count(*) as count FROM wanted_requests WHERE status = 'OPEN'",
    );

    return {
      insertedCount,
      updatedCount,
      totalDemoRequests: DEMO_WANTED_REQUESTS.length,
      records,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Self-invoking when run directly via tsx
if (require.main === module) {
  seedWantedRequests()
    .then(async (result) => {
      console.log('Wanted Requests Seeding Summary:');
      console.log(`- Inserted new: ${result.insertedCount}`);
      console.log(`- Updated existing: ${result.updatedCount}`);
      console.log(`- Total demo requests processed: ${result.totalDemoRequests}`);
      for (const r of result.records) {
        console.log(`  • [${r.category}] ${r.title} (by ${r.author}) -> ID: ${r.id}`);
      }
      if (pool) await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Failed to seed wanted requests:', err);
      if (pool) await pool.end();
      process.exit(1);
    });
}
