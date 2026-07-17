/** Stable machine tokens for security-relevant events (docs/architecture/06-security.md §4). */
export const AuditAction = {
  LoginSuccess: "auth.login.success",
  LoginFailure: "auth.login.failure",
  Logout: "auth.logout",
  AdminCreated: "auth.admin.created",
  FileDeleted: "file.deleted",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];
