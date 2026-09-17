# Nataiji Platform Owner / Super Admin

The platform owner is a global role that is distinct from a school administrator and from a teacher.

## Role hierarchy

1. `owner` — Platform owner / Super Admin
2. `admin` — School administrator, limited to one `schoolId`
3. `teacher` — Teacher, limited to assigned classes and permissions

## Owner capabilities

- View platform-wide statistics without exposing unrelated school records by default.
- Manage schools and their activation status.
- Manage school administrator accounts.
- Manage subscription/billing status when billing is introduced.
- View service health and operational diagnostics.
- Support account recovery and administrative interventions with explicit audit trails.
- Never inherit unrestricted access to pupil data simply because the account is an owner. Cross-school pupil data access must be an explicit, auditable support action.

## Security rules

- Existing school isolation by `schoolId` remains mandatory for `admin` and `teacher` users.
- Owner endpoints must use separate authorization middleware (`ownerOnly`).
- Owner accounts must not be created through the public school-registration endpoint.
- Owner identity should be provisioned from a protected deployment secret or a dedicated secure administrative setup flow.
- Every future owner mutation should be logged with actor, target, action, and timestamp.

## Mobile identity

Application identifier: `mr.nataiji.app`

Official app brand: `نتائجي | NATAIJI`

Official application logo asset: `/public/app-logo-nataiji.svg`
