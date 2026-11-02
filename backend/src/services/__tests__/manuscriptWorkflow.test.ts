import { MANUSCRIPT_STATUSES, ManuscriptStatus } from '../../models/Manuscript';
import { ADMIN_TRANSITIONS, ADMIN_DECISIONS, NOTE_REQUIRED, canAdminTransition, canAuthorResubmit, statusCopy } from '../manuscriptWorkflow';

describe('manuscript workflow', () => {
  it('defines a rule for every status', () => {
    expect(Object.keys(ADMIN_TRANSITIONS).sort()).toEqual([...MANUSCRIPT_STATUSES].sort());
  });

  it.each<[ManuscriptStatus, ManuscriptStatus, boolean]>([
    ['Submitted', 'Under Review', true],
    ['Submitted', 'Accepted', true],
    ['Submitted', 'Rejected', true],
    ['Submitted', 'Changes Requested', true],
    ['Under Review', 'Accepted', true],
    ['Under Review', 'Changes Requested', true],
    ['Under Review', 'Submitted', false],
    ['Changes Requested', 'Rejected', true],
    ['Changes Requested', 'Accepted', false], // must come back through the author first
    ['Accepted', 'Under Review', false],
    ['Accepted', 'Rejected', false],
    ['Rejected', 'Accepted', false],
    ['Published', 'Rejected', false],
  ])('%s -> %s allowed: %s', (from, to, allowed) => {
    expect(canAdminTransition(from, to)).toBe(allowed);
  });

  it('never lets an admin decision reach Published; that is the publish action only', () => {
    expect(ADMIN_DECISIONS as readonly string[]).not.toContain('Published');
    for (const targets of Object.values(ADMIN_TRANSITIONS)) expect(targets).not.toContain('Published');
  });

  it('Accepted, Rejected and Published are terminal for decisions', () => {
    for (const status of ['Accepted', 'Rejected', 'Published'] as const) expect(ADMIN_TRANSITIONS[status]).toHaveLength(0);
  });

  it('demands an explanation for the decisions an author needs to act on', () => {
    expect(NOTE_REQUIRED).toEqual(expect.arrayContaining(['Rejected', 'Changes Requested']));
    expect(NOTE_REQUIRED).not.toContain('Accepted');
  });

  it('lets an author edit and resubmit only when changes were requested', () => {
    expect(MANUSCRIPT_STATUSES.filter(canAuthorResubmit)).toEqual(['Changes Requested']);
  });

  it('writes a message for every status that names the book', () => {
    for (const status of MANUSCRIPT_STATUSES) {
      const copy = statusCopy(status, 'My Book');
      expect(copy.headline.length).toBeGreaterThan(5);
      expect(copy.message).toContain('My Book');
    }
  });
});
