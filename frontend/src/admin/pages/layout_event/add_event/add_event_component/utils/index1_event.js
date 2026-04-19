// ==================== UTILITY FUNCTIONS ====================

export const generateId = () => `ZONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const getPolygonBounds = (points) => {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
};

export const isPointInRect = (px, py, x, y, width, height) => {
  return px >= x && px <= x + width && py >= y && py <= y + height;
};

export const isPointInPolygon = (px, py, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};