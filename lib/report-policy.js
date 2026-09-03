export const ACQUISITION_TYPES = Object.freeze(["draw", "guaranteed", "total", "unknown"]);
export const USER_ACQUISITION_TYPES = Object.freeze(["draw", "guaranteed", "total"]);
export const RESULT_INPUT_MODES = Object.freeze(["detailed", "simple"]);

export function acquisitionTypeOf(entry = {}) {
  return entry.acquisitionType ?? "draw";
}

export function isActiveUserReport(report = {}) {
  return report.status === "active" && (report.sourceType ?? "user") === "user" && !report.withdrawn;
}

export function isDrawEntry(entry = {}) {
  return acquisitionTypeOf(entry) === "draw";
}

export function prizeInputModeOf(payload = {}) {
  return payload.prizeInputMode ?? "by_acquisition";
}

export function resultInputModeOf(payload = {}) {
  return payload.resultInputMode ?? "detailed";
}

export function canWithdrawReport(report = {}, userId) {
  return Boolean(userId) && report.userId === userId && !report.withdrawn;
}
