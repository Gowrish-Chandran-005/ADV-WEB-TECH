import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { AuthDependencies } from '../src/modules/auth/auth.dependencies';
import type { AuthUser, UserRepository } from '../src/modules/auth/auth.types';
import { UPLOADS_DIR } from '../src/modules/upload/upload.router';

const secret = 'equipment-test-secret-with-at-least-thirty-two-characters';
const studentId = '3d33fd4a-f243-4bee-b6cf-5b51175d4077';

function student(id: string): AuthUser {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id,
    email: `${id}@vitstudent.ac.in`,
    fullName: 'Upload Test Student',
    registrationNumber: '21BCE1001',
    phone: null,
    role: 'STUDENT',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function tokenFor(id: string): string {
  return jwt.sign({ tokenVersion: 0 }, secret, {
    algorithm: 'HS256',
    audience: 'lendr',
    issuer: 'lendr-api',
    expiresIn: '1h',
    subject: id,
  });
}

function authDependencies(user = student(studentId)): AuthDependencies {
  const users: UserRepository = {
    async findById(id: string) {
      return id === user.id ? user : null;
    },
    async findByEmail() {
      return null;
    },
    async create() {
      throw new Error('Unused');
    },
    async incrementTokenVersion() {
      throw new Error('Unused');
    },
    async updateProfile() {
      throw new Error('Unused');
    },
  };

  return {
    users,
    jwtSecret: secret,
    jwtExpiresIn: '1h',
    passwordHashRounds: 4,
  };
}

describe('Photo Upload Persistence & Security', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const app = createApp(undefined, authDependencies());
    const response = await request(app)
      .post('/api/v1/uploads')
      .attach('file', Buffer.from('fake image data'), 'test.jpg');

    expect(response.status).toBe(401);
  });

  it('rejects unsupported file mime types', async () => {
    const app = createApp(undefined, authDependencies());
    const response = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${tokenFor(studentId)}`)
      .attach('file', Buffer.from('plain text'), 'test.txt');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects files with spoofed MIME types when content signature is invalid', async () => {
    const app = createApp(undefined, authDependencies());
    // Send arbitrary text with image/jpeg header
    const fakeJpeg = Buffer.from('NOT_A_REAL_JPEG_IMAGE_DATA_HEADER');

    const filesBefore = fs.readdirSync(UPLOADS_DIR);

    const response = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${tokenFor(studentId)}`)
      .attach('file', fakeJpeg, { filename: 'malicious.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_SIGNATURE');

    // Verify cleanup: no orphaned file remains in UPLOADS_DIR
    const filesAfter = fs.readdirSync(UPLOADS_DIR);
    expect(filesAfter.length).toBe(filesBefore.length);
  });

  it('successfully uploads valid PNG and JPEG images, persists to disk, and serves statically', async () => {
    const app = createApp(undefined, authDependencies());
    // 1x1 valid PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    // Minimal valid JPEG header (FF D8 FF E0 00 10 4A 46 49 46 00 01 ...)
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
    ]);

    const response = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${tokenFor(studentId)}`)
      .attach('files', pngBuffer, { filename: 'angle-1.png', contentType: 'image/png' })
      .attach('files', jpegBuffer, { filename: 'angle-2.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(2);

    const firstItem = response.body.items[0];
    const secondItem = response.body.items[1];

    expect(firstItem.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
    expect(secondItem.url).toMatch(/^\/uploads\/[0-9a-f-]+\.jpe?g$/);

    // Verify persistence on disk
    const savedPath1 = path.join(UPLOADS_DIR, firstItem.filename);
    const savedPath2 = path.join(UPLOADS_DIR, secondItem.filename);
    expect(fs.existsSync(savedPath1)).toBe(true);
    expect(fs.existsSync(savedPath2)).toBe(true);

    // Verify static serving through Express
    const staticRes1 = await request(app).get(firstItem.url);
    expect(staticRes1.status).toBe(200);
    expect(staticRes1.headers['content-type']).toContain('image/png');

    const staticRes2 = await request(app).get(secondItem.url);
    expect(staticRes2.status).toBe(200);
    expect(staticRes2.headers['content-type']).toContain('image/jpeg');

    // Clean up created test files
    fs.unlinkSync(savedPath1);
    fs.unlinkSync(savedPath2);
  });
});
