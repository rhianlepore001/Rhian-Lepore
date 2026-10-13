import { describe, expect, it } from 'vitest';
import {
  buildOwnerClientPhotoPath,
  buildPublicClientPhotoPath,
} from '../../utils/clientPhotoPath';

describe('clientPhotoPath (A-01)', () => {
  const uid = 'a0000000-0000-4000-8000-0000000000a0';
  const ts = 1700000000123;

  it('CRM path is uploaderId/ts.ext (tenant folder)', () => {
    expect(buildOwnerClientPhotoPath(uid, 'png', ts)).toBe(`${uid}/${ts}.png`);
  });

  it('public booking path is businessId/public_ts.ext (not flat)', () => {
    const p = buildPublicClientPhotoPath(uid, 'jpg', ts);
    expect(p).toBe(`${uid}/public_${ts}.jpg`);
    expect(p.startsWith('public_')).toBe(false);
    expect(p.split('/')[0]).toBe(uid);
  });
});
