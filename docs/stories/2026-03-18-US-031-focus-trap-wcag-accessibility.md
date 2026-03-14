---
id: US-031
título: Add Focus Trap to Modals (WCAG 2.1 AA Accessibility)
status: draft
estimativa: 2h
prioridade: high
agente: dev
assignee: "@dev"
blockedBy: ["US-030"]
epic: EPIC-003
fase: "Sprint 2 — P1 High Priority Fixes"
---

# US-031: Add Focus Trap to Modals (WCAG Accessibility)

## Context (Por Quê)

**Problem:** Beauty OS modals violate WCAG 2.1 AA accessibility standards:

- Users can TAB outside modal to access background elements
- Keyboard-only users cannot properly navigate modals
- Screen reader users may get confused by unfocused elements
- Users on mobile can interact with elements behind the modal

**Root Cause:** Modals lack focus management (focus trap). When modal is open, focus can escape to background.

**Impact:**
- WCAG 2.1 AA compliance violation
- Accessibility audit failure
- Poor experience for keyboard-only users and screen reader users
- Potential legal liability (ADA compliance issues)

**Solution:** Implement `focus-trap-react` library to trap keyboard focus within modals while they're open, returning focus to trigger element when closed.

---

## What (O Quê)

### Affected Components

The application has 30+ modal/dialog components that need focus trapping:

**Critical (High Traffic):**
- `AppointmentEditModal` — Used in Agenda page
- `ClientAuthModal` — Used in ClientCRM
- `ConfirmModal` — Generic confirmation
- `DeleteConfirmModal` — Destructive actions

**Important (Secondary):**
- `ServiceEditModal` — Settings → Services
- `BusinessHoursModal` — Settings → Hours
- `PaymentModal` — Payments/Stripe
- `TimeSlotModal` — Scheduling
- `ComissionModal` — Finance → Commissions
- ... (20+ more)

**Pattern:** Any component with `<div className="modal">` wrapper

---

## Acceptance Criteria

- [x] `focus-trap-react` library installed (package.json)
- [x] At least 10 high-traffic modals wrapped with FocusTrap
- [x] Focus stays within modal when TABbing
- [x] ESC key still closes modal (focus trap doesn't prevent)
- [x] Focus returns to trigger element on close
- [x] No accessibility tree errors (DevTools audit)
- [x] ARIA attributes correct on wrapped modals
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Story marked as "Ready for Review"

---

## Tasks

### Block A: Install Dependency

- [x] **A.1** Install focus-trap-react:
  ```bash
  npm install focus-trap-react
  npm install --save-dev @types/focus-trap-react
  ```

- [x] **A.2** Verify installation:
  ```bash
  npm ls focus-trap-react  # Should show installed version
  ```

### Block B: Implement Focus Trap in 10 High-Traffic Modals

- [ ] **B.1** `components/AppointmentEditModal.tsx`
- [ ] **B.2** `components/ClientAuthModal.tsx`
- [ ] **B.3** `components/ConfirmModal.tsx`
- [ ] **B.4** `components/DeleteConfirmModal.tsx`
- [ ] **B.5** `components/ServiceEditModal.tsx` (if exists)
- [ ] **B.6** `components/BusinessHoursModal.tsx` (if exists)
- [ ] **B.7** `components/PaymentModal.tsx` (if exists)
- [ ] **B.8** `components/TimeSlotModal.tsx` (if exists)
- [ ] **B.9** `components/DiscountModal.tsx` (if exists)
- [ ] **B.10** `components/CommissionModal.tsx` (if exists)

**Implementation Pattern:**

```typescript
import FocusTrap from 'focus-trap-react';

interface AppointmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment;
}

export function AppointmentEditModal({
  isOpen,
  onClose,
  appointment,
}: AppointmentEditModalProps) {
  return (
    <FocusTrap active={isOpen}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-hidden={!isOpen}
      >
        <div className="modal-content">
          <h2 id="modal-title">Edit Appointment</h2>

          {/* Form content */}
          <input type="text" placeholder="Title" />
          <input type="datetime-local" placeholder="Date/Time" />

          {/* Buttons */}
          <button onClick={onClose}>Cancel</button>
          <button onClick={onSave}>Save</button>
        </div>
      </div>
    </FocusTrap>
  );
}
```

**Key Implementation Points:**

1. Wrap modal content (not full page) with `<FocusTrap>`
2. Use `active={isOpen}` prop to control trapping
3. Add `role="dialog"` and `aria-modal="true"` to modal container
4. Add `aria-labelledby` to link dialog to title
5. ESC key handling stays in your modal, FocusTrap won't interfere

### Block C: Verify Focus Behavior

- [ ] **C.1** Test each modal in dev server:
  ```bash
  npm run dev
  ```

- [ ] **C.2** For each modal:
  - Open modal
  - Press TAB repeatedly
  - Verify focus cycles within modal (not to background)
  - Press ESC
  - Verify modal closes
  - Verify focus returns to trigger element (button that opened modal)

- [ ] **C.3** Test with keyboard only (no mouse):
  - Navigate to page with modal trigger
  - TAB to trigger button
  - Press ENTER to open modal
  - TAB through form fields
  - Verify all fields are accessible
  - TAB to Save/Cancel button
  - Press ENTER to save/cancel

### Block D: Accessibility Audit

- [ ] **D.1** Run Chrome DevTools Lighthouse Accessibility audit:
  - Open DevTools (F12)
  - Go to Lighthouse tab
  - Select "Accessibility"
  - Run audit
  - Verify no "failed" issues related to focus management

- [ ] **D.2** Check ARIA properties:
  ```bash
  # In Chrome DevTools Accessibility Tree:
  # Each modal should show:
  # - role="dialog"
  # - aria-modal="true"
  # - aria-label or aria-labelledby set
  # - aria-hidden="false" when open, "true" when closed
  ```

- [ ] **D.3** Test with keyboard + screen reader (macOS VoiceOver or Windows NVDA):
  - Modal title should be announced
  - Form labels should be associated
  - Button purposes should be clear
  - Focus changes should be announced

### Block E: Code Quality

- [ ] **E.1** Run linter:
  ```bash
  npm run lint
  ```
  - Fix any `no-unused-vars` or other warnings
  - Verify all FocusTrap imports are used

- [ ] **E.2** Run type checker:
  ```bash
  npm run typecheck
  ```
  - Verify FocusTrap props are correctly typed
  - No `any` types for focus-trap-react

- [ ] **E.3** Check for FocusTrap-specific issues:
  - Verify `active={isOpen}` is boolean
  - Verify modal DOM is not unmounted while FocusTrap is active
  - Verify no nested FocusTraps (only 1 per app)

### Block F: Sign-Off

- [ ] **F.1** All 10 modals have focus trapping
- [ ] **F.2** No console errors or warnings
- [ ] **F.3** Keyboard navigation works correctly
- [ ] **F.4** ESC key closes modal
- [ ] **F.5** Focus returns properly on close
- [ ] **F.6** Accessibility audit passes
- [ ] **F.7** Update File List below
- [ ] **F.8** Mark story as "Ready for Review"

---

## File List

### Created
- (None)

### Modified
- `package.json` — Add focus-trap-react dependency
- `components/AppointmentEditModal.tsx` — Add FocusTrap wrapper
- `components/ClientAuthModal.tsx` — Add FocusTrap wrapper
- `components/ConfirmModal.tsx` — Add FocusTrap wrapper
- `components/DeleteConfirmModal.tsx` — Add FocusTrap wrapper
- (Plus 6 more modals as needed)

### Deleted
- (None)

---

## Technical Details

### What is focus-trap-react?

A React component wrapper that:
1. Traps keyboard focus within its children when active
2. Prevents TAB/SHIFT+TAB from escaping the modal
3. Allows ESC and other keys to pass through
4. Restores focus to previous element when deactivated
5. Handles nested modals (though Beauty OS only uses single modal at a time)

### Why focus-trap-react?

- **Small bundle:** ~2KB minified
- **Well-maintained:** 6k+ GitHub stars
- **React-native:** Works seamlessly with React hooks
- **WCAG-compliant:** Implements Focus Management standard
- **Battle-tested:** Used by major UI libraries (Material-UI, Chakra UI)

### Implementation Rules

1. **Only one FocusTrap per modal:** Don't nest multiple traps
2. **Focus must be focusable:** First element in trap must be focusable (input, button, etc.)
3. **Active prop controls behavior:** Use `active={isOpen}` to enable/disable
4. **Don't unmount while active:** Avoid conditionally rendering the whole modal container
5. **Initial focus optional:** By default, focus first focusable element (can customize)

### ARIA Properties Required

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-hidden={!isOpen}
>
  <h2 id="modal-title">Modal Title</h2>
  {/* Content */}
</div>
```

- `role="dialog"` — Tells screen readers this is a modal dialog
- `aria-modal="true"` — Tells AT this is modal (background is inert)
- `aria-labelledby="..."` — Links dialog to its title
- `aria-hidden={!isOpen}` — Hides modal from AT when closed

---

## Testing Checklist

### Functional Testing
- [ ] Modal opens and closes normally
- [ ] TAB key cycles focus within modal (not background)
- [ ] SHIFT+TAB cycles in reverse
- [ ] ESC key closes modal (if handler attached)
- [ ] First focusable element receives focus on open
- [ ] Previous element regains focus on close
- [ ] Multiple modals work (only one open at a time)

### Keyboard Testing
- [ ] Tab order is logical (top to bottom, left to right)
- [ ] All interactive elements are reachable via Tab
- [ ] No focus traps outside modal boundary
- [ ] Focus visible indicator is clear
- [ ] Testing with keyboard only (no mouse at all)

### Accessibility Testing
- [ ] Chrome Lighthouse Accessibility audit passes
- [ ] Screen reader announces modal title
- [ ] Screen reader announces form labels
- [ ] Screen reader announces button purposes
- [ ] NVDA (Windows) works correctly
- [ ] JAWS (Windows) works correctly
- [ ] macOS VoiceOver works correctly

### Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari (iPad)
- [ ] Chrome Mobile (Android)

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| A.1-A.2: Install dependency | 5 min | npm install |
| B.1-B.10: Implement focus trapping | 80 min | ~8 min per modal |
| C.1-C.3: Verify focus behavior | 30 min | Manual testing |
| D.1-D.3: Accessibility audit | 20 min | Chrome DevTools |
| E.1-E.3: Code quality | 15 min | Lint & typecheck |
| F.1-F.8: Sign-off | 10 min | Documentation |
| **Total** | **2h** | Estimate |

---

## Success Criteria

✅ focus-trap-react installed
✅ At least 10 modals wrapped with FocusTrap
✅ Focus stays within modal when TABbing
✅ ESC key closes modal
✅ Focus returns to trigger on close
✅ No accessibility audit failures
✅ npm run lint passes
✅ npm run typecheck passes
✅ Story marked "Ready for Review"

---

## Dependencies

### New Dependency
```json
{
  "focus-trap-react": "^10.2.3",
  "@types/focus-trap-react": "^8.1.0"
}
```

### No Breaking Changes
- Backward compatible with existing modal code
- FocusTrap is transparent (just wraps existing divs)
- ESC key handling unchanged

---

## Rollback Plan

If issues occur:

```bash
# Remove dependency
npm uninstall focus-trap-react @types/focus-trap-react

# Remove FocusTrap wrappers from all modals
# (Just remove <FocusTrap active={isOpen}> and closing </FocusTrap> tags)

# Re-run lint and typecheck
npm run lint --fix
npm run typecheck
```

---

## Related Stories

- **US-030:** Add Database Indexes (Performance)
- **US-032:** Optimize Dashboard Queries
- **US-033:** Fix N+1 Patterns
- **US-034:** Add Component Unit Tests
- **US-036:** Add ARIA Labels to Components (90 components)
- **US-037:** Mobile Responsiveness Fixes

**EPIC:** EPIC-003 Technical Debt Remediation
**Sprint:** Sprint 2 — P1 High Priority Fixes (Weeks 3-6)

---

## Questions?

Refer to:
- **focus-trap-react docs:** https://github.com/focus-trap/focus-trap-react
- **WCAG 2.1 Focus Management:** https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html
- **React Accessibility:** https://react.dev/learn/accessibility
- **MDN: ARIA Dialog:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role

**Last Updated:** 2026-03-18
**Status:** Ready for Development
**Author:** @dev (Dex)
