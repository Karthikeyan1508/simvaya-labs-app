jest.mock('../db/viva-repo', () => ({
  vivaRow: jest.fn(),
  attemptFor: jest.fn(),
  deleteViva: jest.fn(),
  vivasOwnedBy: jest.fn(),
  inTransaction: jest.fn(),
}));
// @nestjs/common 12 is ESM only under this CommonJS Jest, so the exceptions are stubbed with their status codes.
jest.mock('@nestjs/common', () => {
  const ex = (status: number) => class extends Error { status = status; };
  return { BadRequestException: ex(400), ConflictException: ex(409), NotFoundException: ex(404) };
});
import * as repo from '../db/viva-repo';
import { abandonViva, listMyVivas } from './viva.service';

const m = repo as unknown as Record<string, jest.Mock>;
const viva = { id: 5, owner_id: 'u1', title: 't', experiment_id: 'zener-regulator', status: 'published' };

beforeEach(() => jest.resetAllMocks());

describe('abandonViva', () => {
  it('deletes when there is no attempt', async () => {
    m.vivaRow.mockResolvedValue(viva);
    m.attemptFor.mockResolvedValue(undefined);
    await expect(abandonViva(5, 'u1')).resolves.toEqual({ ok: true });
    expect(m.deleteViva).toHaveBeenCalledWith(5, 'u1');
  });
  it('deletes an in-progress attempt', async () => {
    m.vivaRow.mockResolvedValue(viva);
    m.attemptFor.mockResolvedValue({ id: 1, status: 'in_progress' });
    await abandonViva(5, 'u1');
    expect(m.deleteViva).toHaveBeenCalled();
  });
  it('409 when submitted', async () => {
    m.vivaRow.mockResolvedValue(viva);
    m.attemptFor.mockResolvedValue({ id: 1, status: 'submitted' });
    await expect(abandonViva(5, 'u1')).rejects.toMatchObject({ status: 409 });
    expect(m.deleteViva).not.toHaveBeenCalled();
  });
  it('404 for another user or missing viva', async () => {
    m.vivaRow.mockResolvedValue(viva);
    await expect(abandonViva(5, 'other')).rejects.toMatchObject({ status: 404 });
    m.vivaRow.mockResolvedValue(undefined);
    await expect(abandonViva(5, 'u1')).rejects.toMatchObject({ status: 404 });
    expect(m.deleteViva).not.toHaveBeenCalled();
  });
});

describe('submittedAt', () => {
  it('is returned on myAttempt', async () => {
    m.vivasOwnedBy.mockResolvedValue([{ ...viva, question_count: 1, attempt_count: 1, submitted_count: 1 }]);
    m.attemptFor.mockResolvedValue({ id: 1, status: 'submitted', score: 2, pending_review: 0, submitted_at: '2026-01-01T00:00:00Z' });
    const [r] = await listMyVivas('u1');
    expect(r.myAttempt?.submittedAt).toBe('2026-01-01T00:00:00Z');
  });
});
