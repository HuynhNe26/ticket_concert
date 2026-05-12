export function updateZone(zones, updatedZone) {
  return zones.map((z) =>
    z.id === updatedZone.id ? updatedZone : z
  );
}

export function addZone(zones, newZone) {
  return [...zones, newZone];
}
