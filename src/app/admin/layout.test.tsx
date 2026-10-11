import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), select: vi.fn(), bootstrap: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/admin-identity', () => ({ isAdminEmail: mocks.bootstrap }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
import AdminLayout from './layout';
beforeEach(() => { vi.clearAllMocks(); mocks.bootstrap.mockReturnValue(false); });
function dbRole(isAdmin: boolean) {
  const chain = { from: () => chain, where: () => chain, limit: async () => [{ isAdmin }] };
  mocks.select.mockReturnValue(chain);
}
describe('admin layout authorization', () => {
  it('rejects a revoked admin with an older admin JWT', async () => {
    mocks.auth.mockResolvedValue({ user: { email: 'learner@example.test', isAdmin: true } });
    dbRole(false);
    expect((await AdminLayout({ children: 'PRIVATE' })).props.children).not.toBe('PRIVATE');
    expect(mocks.select).toHaveBeenCalledOnce();
  });
  it('accepts a promoted admin with a stale non-admin JWT', async () => {
    mocks.auth.mockResolvedValue({ user: { email: 'learner@example.test', isAdmin: false } });
    dbRole(true);
    expect((await AdminLayout({ children: 'PRIVATE' })).props.children).toBe('PRIVATE');
  });
  it('retains the bootstrap recovery path', async () => {
    mocks.auth.mockResolvedValue({ user: { email: 'bootstrap@example.test' } });
    mocks.bootstrap.mockReturnValue(true);
    expect((await AdminLayout({ children: 'PRIVATE' })).props.children).toBe('PRIVATE');
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
