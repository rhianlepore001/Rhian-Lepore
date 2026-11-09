import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Staff opening /financeiro by direct URL must be redirected to the dashboard by the same
// OwnerRouteGuard used by every owner-only route (no error screen: the finance RPCs are owner-only).
describe('rota /financeiro', () => {
  const app = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');
  it('é protegida pelo OwnerRouteGuard', () => {
    expect(app).toMatch(/<Route path="\/financeiro" element={<OwnerRouteGuard><Finance \/><\/OwnerRouteGuard>} \/>/);
  });
  it('o guard manda o colaborador para o painel', () => {
    const guard = app.slice(app.indexOf('const OwnerRouteGuard'), app.indexOf('const ClientsRouteGuard'));
    expect(guard).toMatch(/role === 'staff'[\s\S]*<Navigate to="\/" replace \/>/);
  });
});
