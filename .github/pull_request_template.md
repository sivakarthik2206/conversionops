## Summary
<!-- What does this PR do? -->

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Schema change (requires migration)
- [ ] Compliance change
- [ ] Performance improvement
- [ ] Refactor

## Schema Changes
- [ ] No schema changes
- [ ] Added model(s): 
- [ ] Modified model(s): 
- [ ] Migration tested locally

## Checklist
- [ ] Tenant isolation tests added/updated
- [ ] New API endpoints have RBAC guard
- [ ] New outbound SMS paths check ConsentRecord
- [ ] AuditLog entries added for consequential actions
- [ ] Idempotency key used for external webhooks
- [ ] Composite indexes added for new query patterns
- [ ] No raw strings where enum exists

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Isolation tests pass (`pnpm test:isolation`)
