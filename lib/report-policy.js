export const ACQUISITION_TYPES = Object.freeze(["draw", "guaranteed", "unknown"]);
export const USER_ACQUISITION_TYPES = Object.freeze(["draw", "guaranteed"]);

export function acquisitionTypeOf(entry = {}) {
  return entry.acquisitionType ?? "draw";
}

export function isActiveUserReport(report = {}) {
  return report.status === "active" && (report.sourceType ?? "user") === "user" && !report.withdrawn;
}

export function isDrawEntry(entry = {}) {
  return acquisitionTypeOf(entry) === "draw";
}

export function canWithdrawReport(report = {}, userId) {
  return Boolean(userId) && report.userId === userId && !report.withdrawn;
}
