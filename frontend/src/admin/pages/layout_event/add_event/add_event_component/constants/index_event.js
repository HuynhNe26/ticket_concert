export const SHAPE_TYPES = {
  RECT: 'rect',
  POLYGON: 'polygon'
};

export const ZONE_TYPES = [
  { value: 'Sân khấu', label: 'Sân khấu' },
  { value: 'Đứng', label: 'Khu vực đứng' },
  { value: 'Ngồi', label: 'Khu vực ngồi' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Quản lý', label: 'Quản lý/Kỹ thuật' }
];

export const PRESET_COLORS = [
  '#FF2D2D', '#00C7D9', '#00838F', '#2E7D8A', '#0D47A1',
  '#FFB74D', '#FF5A4F', '#FF3B7F', '#1E88E5', '#555555',
  '#888888', '#4CAF50', '#9C27B0', '#FFC107', '#E91E63'
];

export const EVENT_CATEGORIES = [
  { value: 'concert', label: 'Hòa nhạc' },
  { value: 'festival', label: 'Lễ hội' },
  { value: 'conference', label: 'Hội nghị' },
  { value: 'sport', label: 'Thể thao' },
  { value: 'theater', label: 'Sân khấu' },
  { value: 'other', label: 'Khác' }
];

export const DEFAULT_LAYOUT = {
  canvas: {
    width: 1200,
    height: 700,
    background: '#000000'
  },
  zones: []
};

export const HANDLE_SIZE = 8;