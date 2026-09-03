export function distanceKm(origin, store) {
  if (!origin || !Number.isFinite(store?.latitude) || !Number.isFinite(store?.longitude)) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(store.latitude - origin.latitude);
  const longitudeDelta = radians(store.longitude - origin.longitude);
  const latitude1 = radians(origin.latitude);
  const latitude2 = radians(store.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function sortStores(stores, mode = "default", origin = null) {
  if (mode === "default") return [...stores];
  const sorted = [...stores];
  const nameOrder = (left, right) => String(left.name).localeCompare(String(right.name), "ja");
  const stats = (store) => store.stats ?? {};
  sorted.sort((left, right) => {
    if (mode === "name") return nameOrder(left, right);
    if (mode === "reports") return Number(stats(right).reportCount ?? 0) - Number(stats(left).reportCount ?? 0) || nameOrder(left, right);
    if (mode === "draws") return Number(stats(right).totalDraws ?? 0) - Number(stats(left).totalDraws ?? 0) || nameOrder(left, right);
    if (mode === "recent") return String(stats(right).latestReportAt ?? "").localeCompare(String(stats(left).latestReportAt ?? "")) || nameOrder(left, right);
    if (mode === "nearest") return (distanceKm(origin, left) ?? Infinity) - (distanceKm(origin, right) ?? Infinity) || nameOrder(left, right);
    return 0;
  });
  return sorted;
}
