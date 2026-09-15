// Thrown by lib/db/projects.ts's createProject() when a free user is over
// their plan's limit — caught by the route handler and turned into a 402.
export class UpgradeRequiredError extends Error {
  readonly code = "upgrade_required";
}
