import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export async function seedCatalogue() {
  if (!pool) {
    throw new Error('No pool connection settings configured.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify and obtain Category IDs
    const catsRes = await client.query<{ id: string; slug: string }>('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(catsRes.rows.map((c) => [c.slug, c.id]));

    // 2. Ensure test users exist with hashed passwords
    const hash = await bcrypt.hash('Password123!', 10);

    // User A: Meera K. (primary test lender)
    const userMeera = await client.query(
      `INSERT INTO users (email, password_hash, full_name, registration_number, phone, role, status)
       VALUES ('meera@vitstudent.ac.in', $1, 'Meera K.', '21BCE0412', '+91 98402 11984', 'STUDENT', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [hash],
    );
    const meeraId = userMeera.rows[0].id;

    // User B: Aarav K. (secondary test lender & borrower)
    const userAarav = await client.query(
      `INSERT INTO users (email, password_hash, full_name, registration_number, phone, role, status)
       VALUES ('aarav@vitstudent.ac.in', $1, 'Aarav K.', '21BCE1492', '+91 98402 99887', 'STUDENT', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [hash],
    );
    const aaravId = userAarav.rows[0].id;

    // User C: Rohan S. (additional test lender)
    const userRohan = await client.query(
      `INSERT INTO users (email, password_hash, full_name, registration_number, phone, role, status)
       VALUES ('rohan@vitstudent.ac.in', $1, 'Rohan S.', '21BME0381', '+91 98402 33445', 'STUDENT', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [hash],
    );
    const rohanId = userRohan.rows[0].id;

    // 3. Archive or safely remove old seed items
    // If equipment has dependent bookings/favorites, ARCHIVE them so booking history is preserved
    await client.query(
      `UPDATE equipment 
       SET status = 'ARCHIVED' 
       WHERE title IN ('Sony Alpha A7 IV', 'DJI Ronin-SC 3-Axis Gimbal', 'Røde Wireless GO II (Dual)')
       AND id IN (SELECT equipment_id FROM bookings)`
    );

    // If equipment has no bookings or favorites, remove old seed copies
    await client.query(
      `DELETE FROM equipment 
       WHERE title IN ('DJI Ronin-SC 3-Axis Gimbal', 'Røde Wireless GO II (Dual)')
       AND id NOT IN (SELECT equipment_id FROM bookings)
       AND id NOT IN (SELECT equipment_id FROM favorites)`
    );

    // 4. Define the 20 distinct, realistic, requestable listings
    // Mix:
    // - Cameras & filmmaking: 5
    // - Audio: 4
    // - Electronics & project kits: 5
    // - Computing, event equipment, academic, sports, tools: 6
    const twentyListings = [
      // ── Category: Cameras and filmmaking (5 items) ──
      {
        seed_key: 'eq-seed-cam-01',
        owner_id: meeraId,
        cat_slug: 'cameras',
        title: 'Canon EOS R6 Mark II Mirrorless Kit',
        description: 'Full-frame 24.2MP 4K60p 10-bit mirrorless kit with RF 24-105mm f/4L lens, 2 batteries and 128GB V60 card.',
        tags: ['4K60p', 'Dual Pixel AF', 'Zero Deposit'],
        features: ['Canon EOS R6 Mark II Body', 'RF 24-105mm f/4L IS USM', '2x LP-E6NH Batteries', 'SanDisk 128GB SDXC V60', 'Dual USB-C Charger', 'Shoulder Bag'],
        use_cases: ['filmmaking', 'interviews', 'event_recording'],
        specifications: { sensor: '24.2 MP Full-Frame CMOS', video: '4K 60p 10-bit 4:2:2', stabilization: 'In-Body 8-Stop IS', mount: 'Canon RF' },
        price: 550,
        deposit: 0,
        location: 'SJT Ground Floor Gate 2',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-cam-02',
        owner_id: meeraId,
        cat_slug: 'cameras',
        title: 'Blackmagic Pocket Cinema Camera 4K Rig',
        description: 'BMPCC 4K cinema kit with SmallRig cage, Samsung T5 500GB SSD, 3x LP-E6 batteries and top handle.',
        tags: ['Blackmagic RAW', 'Cinema 4K', 'Zero Deposit'],
        features: ['BMPCC 4K Body', 'SmallRig Cage & Top Handle', 'Samsung T5 500GB SSD', '3x LP-E6 Batteries', '12V DC Power Adapter', 'Pelican Style Hard Case'],
        use_cases: ['filmmaking', 'night_shooting'],
        specifications: { sensor: '4/3 HDR Sensor', dynamic_range: '13 Stops', recording: 'Blackmagic RAW / ProRes', display: '5-inch Touchscreen' },
        price: 500,
        deposit: 0,
        location: 'MH Block D Entrance',
        condition: 'GOOD',
        image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-cam-03',
        owner_id: rohanId,
        cat_slug: 'lighting',
        title: 'DJI RS 3 Pro 3-Axis Camera Gimbal',
        description: 'Professional 4.5kg payload motorized gimbal with automated axis locks, quick-release plate and briefcase handle.',
        tags: ['4.5kg Payload', 'Carbon Fiber', 'Zero Deposit'],
        features: ['DJI RS 3 Pro Gimbal', 'BG30 Battery Grip (12h)', 'Extended Grip/Tripod', 'Briefcase Handle', 'Lens-Fastening Support', 'Carrying Case'],
        use_cases: ['filmmaking', 'event_recording'],
        specifications: { payload: '4.5 kg (10 lbs)', battery_life: '12 Hours', weight: '1.5 kg', connectivity: 'Bluetooth 5.0' },
        price: 350,
        deposit: 0,
        location: 'TT Library Lawn Gazebo',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1589872307379-0ffdf9829123?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-cam-04',
        owner_id: meeraId,
        cat_slug: 'lighting',
        title: 'Aputure Amaran 100d LED Video Studio Light',
        description: '100W 5600K daylight-balanced point-source LED light with Bowens mount, reflector and 2.8m air-cushioned stand.',
        tags: ['5600K Daylight', 'CRI 95+', 'Bowens Mount'],
        features: ['Amaran 100d Light Head', '55-Degree Hyper Reflector', 'AC Power Supply Cable', '2.8m Heavy Light Stand', 'Padded Carry Bag'],
        use_cases: ['interviews', 'filmmaking', 'podcasting'],
        specifications: { power: '100 Watts', cri: '95+', cooling: 'Silent Fan', illuminance: '39,500 lux @ 1m' },
        price: 260,
        deposit: 0,
        location: 'SJT 4th Floor Media Lab',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-cam-05',
        owner_id: rohanId,
        cat_slug: 'cameras',
        title: 'GoPro HERO11 Black Creator Edition',
        description: '5.3K60 Ultra HD action camera with Volta battery grip, Media Mod directional mic and Light Mod.',
        tags: ['5.3K 60FPS', 'HyperSmooth 5.0', 'Waterproof'],
        features: ['GoPro HERO11 Black Camera', 'Volta Battery Grip / Tripod', 'Media Mod with Mic', 'Light Mod (200 Lumens)', '2x Enduro Batteries', 'SanDisk 128GB MicroSD'],
        use_cases: ['filmmaking', 'sports', 'event_recording'],
        specifications: { resolution: '27 MP / 5.3K60', stabilization: 'HyperSmooth 5.0', battery: 'Enduro 1720mAh', waterproof: '10m (33ft)' },
        price: 300,
        deposit: 0,
        location: 'Outdoor Sports Stadium Gazebo',
        condition: 'NEW',
        image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80',
      },

      // ── Category: Audio (4 items) ──
      {
        seed_key: 'eq-seed-aud-01',
        owner_id: meeraId,
        cat_slug: 'audio',
        title: 'Røde Wireless PRO Dual-Channel Mic System',
        description: 'Dual wireless lapel microphone kit with 32-bit float on-board recording, timecode and charging case.',
        tags: ['32-bit Float', '260m Range', 'Zero Deposit'],
        features: ['2x Transmitters with internal recording', '1x Dual Receiver', 'Smart Charging Case', '2x Lavalier II Lapel Mics', 'Magnetic Mounts & Cables'],
        use_cases: ['podcasting', 'interviews', 'filmmaking'],
        specifications: { transmission: 'Series IV 2.4GHz', range: '260m (850ft)', onboard_memory: '32GB (>40h)', battery_life: '7 Hours' },
        price: 240,
        deposit: 0,
        location: 'TT Block Gate 1',
        condition: 'NEW',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-aud-02',
        owner_id: rohanId,
        cat_slug: 'audio',
        title: 'Zoom H6 6-Track Portable Audio Recorder',
        description: 'Field recorder with interchangeable XY and mid-side microphone capsules, 4 XLR/TRS combo inputs and 32GB SD card.',
        tags: ['6-Track Recording', '4x XLR Inputs', 'Zero Deposit'],
        features: ['Zoom H6 Recorder Unit', 'XYH-6 X/Y Mic Capsule', 'MSH-6 Mid-Side Capsule', '4x Eneloop Pro AA Batteries', 'Custom Foam Windscreen', 'Hard Carry Case'],
        use_cases: ['podcasting', 'interviews', 'filmmaking'],
        specifications: { tracks: '6 Simultaneous Tracks', inputs: '4x XLR/TRS Combo', resolution: '24-bit / 96kHz', phantom_power: '+12/+24/+48V' },
        price: 220,
        deposit: 0,
        location: 'SMV Building Lawn',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1520523839898-50712825e617?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-aud-03',
        owner_id: meeraId,
        cat_slug: 'audio',
        title: 'Shure SM7B Vocal Studio Microphone',
        description: 'Legendary cardioid dynamic studio vocal mic with Cloudlifter CL-1 mic activator and boom arm stand.',
        tags: ['Studio Standard', 'Cloudlifter Included', 'Zero Deposit'],
        features: ['Shure SM7B Microphone', 'Cloudlifter CL-1 Mic Activator', 'Heavy-Duty Desk Boom Arm', '2x Mogami Gold XLR Cables', 'Close-Talk Windscreen'],
        use_cases: ['podcasting', 'academic_work'],
        specifications: { type: 'Dynamic Cardioid', frequency_response: '50 to 20,000 Hz', output_impedance: '150 Ohms', connector: '3-pin XLR' },
        price: 280,
        deposit: 0,
        location: 'Ladies Hostel Block L Entrance',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-aud-04',
        owner_id: rohanId,
        cat_slug: 'audio',
        title: 'Sennheiser MKE 600 Shotgun Microphone',
        description: 'Professional directional shotgun microphone with shockmount, deadcat furry windshield and XLR to 3.5mm coiled cable.',
        tags: ['Supercardioid', 'Low-Cut Filter', 'Zero Deposit'],
        features: ['Sennheiser MKE 600 Mic', 'MZH 600 Hairy Windshield', 'MZS 600 Camera Shockmount', 'KA 600 Coiled 3.5mm Cable', 'XLR Cable (3m)', 'Zip Pouch'],
        use_cases: ['filmmaking', 'interviews', 'event_recording'],
        specifications: { pattern: 'Supercardioid / Lobar', power: 'Phantom 48V or AA Battery', frequency: '40 Hz - 20 kHz', low_cut: 'Switchable 100 Hz' },
        price: 200,
        deposit: 0,
        location: 'TT Gazebo Ground',
        condition: 'GOOD',
        image: 'https://images.unsplash.com/photo-1543443436-12155aa2ff32?auto=format&fit=crop&w=800&q=80',
      },

      // ── Category: Electronics & project kits (5 items) ──
      {
        seed_key: 'eq-seed-elec-01',
        owner_id: meeraId,
        cat_slug: 'project-kits',
        title: 'Raspberry Pi 4 Model B (8GB) AI Edge Lab',
        description: 'Complete edge computing kit with 8GB RAM, official 32GB microSD (Debian preloaded), argon active cooling case and power brick.',
        tags: ['8GB RAM', 'Quad-Core 1.5GHz', 'Hackathon Ready'],
        features: ['Raspberry Pi 4B (8GB)', 'Argon ONE V2 Cooling Case', 'SanDisk Ultra 32GB MicroSD', 'Official 15.3W USB-C PSU', 'Micro-HDMI to HDMI Cable'],
        use_cases: ['IoT', 'robotics', 'academic_work'],
        specifications: { ram: '8GB LPDDR4', cpu: 'Broadcom BCM2711 1.5GHz', connectivity: 'Gigabit Ethernet, Dual 4K HDMI', wifi: '2.4/5GHz 802.11ac' },
        price: 110,
        deposit: 0,
        location: 'SJT 2nd Floor Computing Lab',
        condition: 'NEW',
        image: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-elec-02',
        owner_id: rohanId,
        cat_slug: 'project-kits',
        title: 'Arduino Mega 2560 R3 + 45-Sensor Explorer Kit',
        description: 'Complete microcontroller development kit with Mega 2560 board, 45 assorted sensors, motor shield and breadboard jumper bundle.',
        tags: ['Arduino Mega', '45 Sensors Box', 'Zero Deposit'],
        features: ['Arduino Mega 2560 R3 Board', '45-Sensor Module Suite', '830-Point Breadboard', 'L298N Motor Driver Module', '120x Jumper Wires Bundle', 'Component Organizer Box'],
        use_cases: ['Arduino', 'robotics', 'IoT'],
        specifications: { microcontroller: 'ATmega2560', digital_io: '54 Pins (15 PWM)', analog_inputs: '16 Pins', clock_speed: '16 MHz' },
        price: 95,
        deposit: 0,
        location: 'MH Block C Courtyard',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-elec-03',
        owner_id: meeraId,
        cat_slug: 'electronics',
        title: 'DJI Mini 3 Pro Drone 4K HDR Quadcopter',
        description: 'Under-249g ultralight drone kit with DJI RC smart screen controller, 3 batteries, two-way charging hub and ND filter set.',
        tags: ['4K60 HDR', '<249g Ultralight', 'Tri-Directional Obstacle'],
        features: ['DJI Mini 3 Pro Aircraft', 'DJI RC Remote with 5.5" Screen', '3x Intelligent Flight Batteries', 'Two-Way Charging Hub', 'ND Filters (16/64/256)', 'Shoulder Bag'],
        use_cases: ['filmmaking', 'event_recording', 'night_shooting'],
        specifications: { takeoff_weight: '249 g', max_flight_time: '34 Mins / battery', camera_sensor: '1/1.3-inch CMOS 48MP', video: '4K/60fps HDR' },
        price: 650,
        deposit: 0,
        location: 'SJT Main Porch',
        condition: 'NEW',
        image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-elec-04',
        owner_id: rohanId,
        cat_slug: 'electronics',
        title: 'Rigol DS1054Z 50MHz 4-Channel Digital Oscilloscope',
        description: 'Four-channel digital storage oscilloscope with 1GSa/s sampling rate, 24Mpts memory depth and 4 passive probes.',
        tags: ['4 Channels', '50MHz Bandwidth', 'Zero Deposit'],
        features: ['Rigol DS1054Z Oscilloscope', '4x Passive Probes (1X/10X)', 'Power Cable', 'USB Host Cable', 'Padded Instrument Case'],
        use_cases: ['academic_work', 'robotics'],
        specifications: { bandwidth: '50 MHz', channels: '4 Analog Channels', sample_rate: '1 GSa/s Real-Time', memory_depth: '24 Mpts Standard' },
        price: 190,
        deposit: 0,
        location: 'TT 3rd Floor Electronics Lab',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-elec-05',
        owner_id: meeraId,
        cat_slug: 'project-kits',
        title: 'NVIDIA Jetson Nano Developer Kit (B01)',
        description: 'Edge AI computing kit with 4GB RAM, 128-core Maxwell GPU, 64GB MicroSD pre-configured with JetPack and 5V 4A DC power supply.',
        tags: ['NVIDIA Jetson', 'CUDA Ready', 'Edge AI'],
        features: ['Jetson Nano B01 Board', 'Metal Heat Sink & Fan', 'Sandisk 64GB Extreme MicroSD', '5V/4A Barrel Jack PSU', 'Intel Dual Band Wi-Fi Card'],
        use_cases: ['robotics', 'IoT', 'academic_work'],
        specifications: { gpu: '128-Core Maxwell', cpu: 'Quad-Core ARM A57', memory: '4GB 64-bit LPDDR4', camera_interface: '2x MIPI CSI-2' },
        price: 140,
        deposit: 0,
        location: 'SJT Ground Floor Nescafe',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80',
      },

      // ── Category: Computing, event, academic & essentials (6 items) ──
      {
        seed_key: 'eq-seed-comp-01',
        owner_id: rohanId,
        cat_slug: 'event-equipment',
        title: 'Epson EB-E01 3300 Lumens XGA 3LCD Projector',
        description: 'High-brightness classroom and auditorium 3LCD projector with 3300 lumens, HDMI/VGA inputs and portable tripod screen.',
        tags: ['3300 Lumens', '3LCD Technology', 'Zero Deposit'],
        features: ['Epson EB-E01 Projector', '5m High-Speed HDMI Cable', 'Wireless Remote with Pointer', 'Power Cable', 'Protective Carry Bag'],
        use_cases: ['presentations', 'academic_work', 'event_recording'],
        specifications: { brightness: '3300 ANSI Lumens', resolution: 'XGA 1024x768', contrast_ratio: '15,000:1', lamp_life: '12,000 Hours (Eco)' },
        price: 280,
        deposit: 0,
        location: 'MB Main Building Auditorium Porch',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-comp-02',
        owner_id: meeraId,
        cat_slug: 'computing',
        title: 'CalDigit TS4 Thunderbolt 4 Dock (18 Ports)',
        description: 'Universal 18-port docking station with 98W Power Delivery, dual 4K/single 8K display support and SD 4.0 card reader.',
        tags: ['Thunderbolt 4', '98W Charging', '18 Ports'],
        features: ['CalDigit TS4 Station', '0.8m Thunderbolt 4 Cable', '230W Power Adapter', 'Vertical Rubber Stand'],
        use_cases: ['academic_work', 'presentations'],
        specifications: { ports: '18 Total (3x TB4, 5x USB-A, 3x USB-C)', power_delivery: '98W', ethernet: '2.5 Gigabit', audio: 'Front & Rear 3.5mm' },
        price: 150,
        deposit: 0,
        location: 'Ladies Hostel Block E Lawn',
        condition: 'NEW',
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-comp-03',
        owner_id: rohanId,
        cat_slug: 'academic',
        title: 'Texas Instruments TI-Nspire CX II CAS Graphing Calculator',
        description: 'Advanced color graphing calculator with Computer Algebra System (CAS), rechargeable battery and USB connection cable.',
        tags: ['CAS Engine', 'Full Color Display', 'Exam Approved'],
        features: ['TI-Nspire CX II CAS Unit', 'Slide-on Protective Hard Case', 'Mini-USB Charging Cable', 'Quick Start Guide'],
        use_cases: ['academic_work'],
        specifications: { screen: '3.2-inch Color 320x240', memory: '90MB Storage / 64MB RAM', battery: 'Rechargeable Li-ion', cas: 'Built-in Algebra Engine' },
        price: 80,
        deposit: 0,
        location: 'TT Central Library Entry',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-comp-04',
        owner_id: meeraId,
        cat_slug: 'sports',
        title: 'Yonex Astrox 88D Pro Badminton Rackets Pair + Kitbag',
        description: 'Tournament-spec badminton pair strung at 26 lbs BG65 with 6x Mavis 350 shuttles and thermo-guard kitbag.',
        tags: ['Pro Strung 26lbs', 'Kitbag Included', 'Zero Deposit'],
        features: ['2x Yonex Astrox 88D Pro Rackets', 'Tube of 6 Mavis 350 Shuttles', 'Thermo-Guard Double Racket Bag', '2x Spare Overgrips'],
        use_cases: ['sports'],
        specifications: { weight_grip: '4U (Avg 83g) G5', string_tension: 'Strung at 26 lbs', flex: 'Stiff', frame: 'HM Graphite' },
        price: 120,
        deposit: 0,
        location: 'VIT Indoor Sports Complex Gate',
        condition: 'GOOD',
        image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-comp-05',
        owner_id: rohanId,
        cat_slug: 'tools',
        title: 'iFixit Pro Tech Electronic Toolkit & Soldering Station',
        description: '64 precision steel driver bit kit, ESD-safe tweezers, spudgers, suction cups, and 60W portable digital soldering iron.',
        tags: ['iFixit Kit', 'Digital Soldering', 'ESD-Safe'],
        features: ['iFixit 64-Bit Driver Handle & Case', '60W USB-C Soldering Iron', 'Lead-Free Solder Wire Tube', 'ESD-Safe Grounding Strap', 'Magnetic Project Mat'],
        use_cases: ['robotics', 'academic_work'],
        specifications: { bit_count: '64 Precision Bits', soldering_temp: '100C - 400C Adjustable', mat: 'Magnetic Project Sheet', case: 'Magnetized Tool Roll' },
        price: 75,
        deposit: 0,
        location: 'MH Block L Common Area',
        condition: 'LIKE_NEW',
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      },
      {
        seed_key: 'eq-seed-comp-06',
        owner_id: meeraId,
        cat_slug: 'other',
        title: 'Anker 521 Portable Power Station (256Wh LiFePO4)',
        description: 'Heavy-duty outdoor battery power station with 200W AC outlet, 60W USB-C PD, dual USB-A and built-in LED ambient lamp.',
        tags: ['256Wh LiFePO4', '200W AC Outlet', 'Field Ready'],
        features: ['Anker 521 Powerhouse (256Wh)', 'AC Wall Charging Adapter', 'Car Cigarette Lighter Cable', 'Protective Padded Bag'],
        use_cases: ['filmmaking', 'event_recording', 'night_shooting'],
        specifications: { capacity: '256 Wh (80,000 mAh)', ac_output: '200W Pure Sine Wave', battery_type: 'LiFePO4 (3000+ Cycles)', weight: '3.7 kg' },
        price: 180,
        deposit: 0,
        location: 'SJT Ground Floor Lawn',
        condition: 'NEW',
        image: 'https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?auto=format&fit=crop&w=800&q=80',
      },
    ];

    // 5. Insert each of the 20 listings idempotently using seed_key tag
    for (const item of twentyListings) {
      const categoryId = catMap[item.cat_slug];
      if (!categoryId) {
        throw new Error(`Category slug "${item.cat_slug}" does not exist in the database.`);
      }

      const allTags = [...item.tags, item.seed_key];

      // Check if item with this seed_key already exists
      const existing = await client.query(
        `SELECT id FROM equipment WHERE $1 = ANY(tags) LIMIT 1`,
        [item.seed_key]
      );

      if (existing.rows.length > 0) {
        // Update existing record to ensure it is ACTIVE and requestable
        await client.query(
          `UPDATE equipment SET
            category_id = $1,
            title = $2,
            description = $3,
            tags = $4,
            features = $5,
            use_cases = $6,
            specifications = $7,
            image_urls = ARRAY[$8],
            daily_rental_price = $9,
            security_deposit = $10,
            max_rental_days = 30,
            pickup_location = $11,
            condition = $12,
            status = 'ACTIVE',
            updated_at = NOW()
          WHERE id = $13`,
          [
            categoryId,
            item.title,
            item.description,
            allTags,
            item.features,
            item.use_cases,
            JSON.stringify(item.specifications),
            item.image,
            item.price,
            item.deposit,
            item.location,
            item.condition,
            existing.rows[0].id,
          ]
        );
      } else {
        // Insert new active listing
        await client.query(
          `INSERT INTO equipment (
            owner_user_id, category_id, title, description,
            tags, features, use_cases, specifications, image_urls,
            daily_rental_price, security_deposit, max_rental_days,
            pickup_location, condition, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ARRAY[$9], $10, $11, 30, $12, $13, 'ACTIVE')`,
          [
            item.owner_id,
            categoryId,
            item.title,
            item.description,
            allTags,
            item.features,
            item.use_cases,
            JSON.stringify(item.specifications),
            item.image,
            item.price,
            item.deposit,
            item.location,
            item.condition,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // 6. Report resulting counts
    const activeEq = await client.query(
      `SELECT count(*) FROM equipment WHERE status = 'ACTIVE'`
    );
    const totalEq = await client.query(
      `SELECT count(*) FROM equipment`
    );
    console.log(`Seeding complete! Active listings: ${activeEq.rows[0].count}, Total records: ${totalEq.rows[0].count}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Self-invoking when run directly
if (require.main === module) {
  seedCatalogue()
    .then(async () => {
      if (pool) await pool.end();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Seeding failed:', e);
      if (pool) await pool.end();
      process.exit(1);
    });
}
