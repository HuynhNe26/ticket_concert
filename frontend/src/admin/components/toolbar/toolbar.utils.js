export function createRectZone() {
  return {
    id: "ZONE_" + Date.now(),
    name: "ZONE MỚI",
    shape: "rect",
    x: 100,
    y: 100,
    width: 150,
    height: 100,
    color: "#4CAF50",
    price: 0,
    total_quantity: 0,
    status: true,
  };
}

export function createPolygonZone() {
  return {
    id: "ZONE_" + Date.now(),
    name: "POLY MỚI",
    shape: "polygon",
    points: [
      [300, 200],
      [360, 180],
      [420, 220],
      [360, 260],
    ],
    color: "#E91E63",
    price: 0,
    total_quantity: 0,
    status: true,
  };
}
