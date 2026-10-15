import dotenv from 'dotenv';
dotenv.config();
import { pool } from '../src/config/database.js';

// ── 5 MẪU SƠ ĐỒ GHẾ / LAYOUT MẪU ──────────────────────────────────────────────
const LAYOUT_TEMPLATES = [
  // Mẫu 1: Mega Stadium Concert (SVĐ Lớn - 15 khu vực)
  {
    name: "Mega Stadium",
    canvas: { width: 1200, height: 700, background: "#0c0d14" },
    zones: [
      { id: "STAGE", name: "STAGE", type: "Sân khấu", color: "#475569", shape: "rect", x: 320, y: 25, width: 560, height: 65, status: false },
      { id: "SUPER_FAN", name: "SUPER FAN VIP", type: "Đứng", color: "#ef4444", price: 3800000, total_quantity: 350, shape: "rect", x: 440, y: 110, width: 320, height: 120 },
      { id: "FANZONE_A", name: "FANZONE A", type: "Đứng", color: "#06b6d4", price: 2400000, total_quantity: 600, shape: "rect", x: 180, y: 110, width: 230, height: 240 },
      { id: "FANZONE_B", name: "FANZONE B", type: "Đứng", color: "#06b6d4", price: 2400000, total_quantity: 600, shape: "rect", x: 790, y: 110, width: 230, height: 240 },
      { id: "GA_1A", name: "GA 1A", type: "Đứng", color: "#0284c7", price: 1600000, total_quantity: 800, shape: "rect", x: 50, y: 110, width: 110, height: 260 },
      { id: "GA_1B", name: "GA 1B", type: "Đứng", color: "#0284c7", price: 1600000, total_quantity: 800, shape: "rect", x: 1040, y: 110, width: 110, height: 260 },
      { id: "VIP_A", name: "VIP A (Ghế)", type: "Ngồi", color: "#f59e0b", price: 2900000, total_quantity: 200, shape: "rect", x: 260, y: 380, width: 160, height: 100 },
      { id: "VIP_B", name: "VIP B (Ghế)", type: "Ngồi", color: "#f59e0b", price: 2900000, total_quantity: 200, shape: "rect", x: 780, y: 380, width: 160, height: 100 },
      { id: "SVIP_CENTER", name: "SVIP CENTER", type: "Ngồi", color: "#ec4899", price: 4500000, total_quantity: 160, shape: "rect", x: 460, y: 260, width: 280, height: 90 },
      { id: "SKY_LOUNGE", name: "SKY LOUNGE", type: "Ngồi", color: "#8b5cf6", price: 5000000, total_quantity: 90, shape: "rect", x: 490, y: 380, width: 220, height: 100 },
      { id: "CAT_1A", name: "CAT 1A", type: "Ngồi", color: "#3b82f6", price: 1200000, total_quantity: 500, shape: "rect", x: 150, y: 510, width: 355, height: 80 },
      { id: "CAT_1B", name: "CAT 1B", type: "Ngồi", color: "#3b82f6", price: 1200000, total_quantity: 500, shape: "rect", x: 695, y: 510, width: 355, height: 80 },
      { id: "CAT_2_UPPER", name: "CAT 2 TẦNG 2", type: "Ngồi", color: "#10b981", price: 800000, total_quantity: 900, shape: "rect", x: 120, y: 610, width: 960, height: 60 },
      { id: "FOH", name: "FOH (Kỹ thuật)", type: "Quản lý", color: "#334155", shape: "rect", x: 520, y: 515, width: 160, height: 70, status: false }
    ]
  },

  // Mẫu 2: Indoor Arena / Nhà Thi Đấu (10 khu vực)
  {
    name: "Indoor Arena",
    canvas: { width: 1200, height: 700, background: "#0e1117" },
    zones: [
      { id: "STAGE", name: "SÂN KHẤU CHÍNH", type: "Sân khấu", color: "#334155", shape: "rect", x: 380, y: 30, width: 440, height: 70, status: false },
      { id: "ARENA_PIT", name: "ARENA STANDING PIT", type: "Đứng", color: "#f43f5e", price: 2200000, total_quantity: 500, shape: "rect", x: 380, y: 130, width: 440, height: 180 },
      { id: "WING_LEFT", name: "WING LEFT (Đứng)", type: "Đứng", color: "#0ea5e9", price: 1500000, total_quantity: 350, shape: "rect", x: 160, y: 130, width: 190, height: 220 },
      { id: "WING_RIGHT", name: "WING RIGHT (Đứng)", type: "Đứng", color: "#0ea5e9", price: 1500000, total_quantity: 350, shape: "rect", x: 850, y: 130, width: 190, height: 220 },
      { id: "PREMIUM_SEAT", name: "PREMIUM SEAT (Chính diện)", type: "Ngồi", color: "#d946ef", price: 3200000, total_quantity: 240, shape: "rect", x: 410, y: 340, width: 380, height: 110 },
      { id: "TIER_1_LEFT", name: "TIER 1 KHÁN ĐÀI A", type: "Ngồi", color: "#f59e0b", price: 1800000, total_quantity: 300, shape: "rect", x: 140, y: 380, width: 230, height: 120 },
      { id: "TIER_1_RIGHT", name: "TIER 1 KHÁN ĐÀI B", type: "Ngồi", color: "#f59e0b", price: 1800000, total_quantity: 300, shape: "rect", x: 830, y: 380, width: 230, height: 120 },
      { id: "BALCONY_CENTER", name: "TẦNG LỬNG BALCONY", type: "Ngồi", color: "#10b981", price: 1100000, total_quantity: 450, shape: "rect", x: 300, y: 480, width: 600, height: 90 },
      { id: "UPPER_DECK", name: "TẦNG TRÊN CÙNG", type: "Ngồi", color: "#64748b", price: 650000, total_quantity: 600, shape: "rect", x: 200, y: 590, width: 800, height: 75 }
    ]
  },

  // Mẫu 3: Nhà Hát & Kịch Nghệ Thuật (Theater - 8 hàng ghế phân tầng)
  {
    name: "Auditorium Theater",
    canvas: { width: 1200, height: 700, background: "#111218" },
    zones: [
      { id: "STAGE", name: "SÂN KHẤU KỊCH", type: "Sân khấu", color: "#475569", shape: "rect", x: 280, y: 30, width: 640, height: 80, status: false },
      { id: "ORCHESTRA_VIP", name: "HÀNG ĐẦU VIP ORCHESTRA", type: "Ngồi", color: "#e11d48", price: 1800000, total_quantity: 120, shape: "rect", x: 300, y: 140, width: 600, height: 70 },
      { id: "STALLS_CENTER", name: "TRUNG TÂM TẦNG TRỆT", type: "Ngồi", color: "#ea580c", price: 1200000, total_quantity: 260, shape: "rect", x: 280, y: 230, width: 640, height: 90 },
      { id: "STALLS_LEFT", name: "TẦNG TRỆT CÁNH TRÁI", type: "Ngồi", color: "#0284c7", price: 900000, total_quantity: 140, shape: "rect", x: 80, y: 180, width: 170, height: 150 },
      { id: "STALLS_RIGHT", name: "TẦNG TRỆT CÁNH PHẢI", type: "Ngồi", color: "#0284c7", price: 900000, total_quantity: 140, shape: "rect", x: 950, y: 180, width: 170, height: 150 },
      { id: "MEZZANINE_VIP", name: "MEZZANINE VIP TẦNG 1", type: "Ngồi", color: "#a855f7", price: 1400000, total_quantity: 180, shape: "rect", x: 260, y: 350, width: 680, height: 85 },
      { id: "BALCONY_TIER", name: "BALCONY TẦNG 2", type: "Ngồi", color: "#14b8a6", price: 750000, total_quantity: 280, shape: "rect", x: 220, y: 460, width: 760, height: 95 },
      { id: "GALLERY", name: "HÀNG GHẾ PHỔ THÔNG (GALLERY)", type: "Ngồi", color: "#64748b", price: 450000, total_quantity: 320, shape: "rect", x: 180, y: 580, width: 840, height: 80 }
    ]
  },

  // Mẫu 4: Acoustic Show & Mây Lang Thang (Sân khấu thân mật - 6 khu vực)
  {
    name: "Acoustic Sunset Garden",
    canvas: { width: 1200, height: 700, background: "#15161f" },
    zones: [
      { id: "STAGE", name: "SÂN KHẤU MÂY", type: "Sân khấu", color: "#334155", shape: "rect", x: 420, y: 40, width: 360, height: 70, status: false },
      { id: "VIP_FRONT", name: "HÀNG ĐẦU GẦN CA SĨ (VIP)", type: "Ngồi", color: "#f43f5e", price: 1500000, total_quantity: 80, shape: "rect", x: 380, y: 140, width: 440, height: 90 },
      { id: "ZONE_A", name: "KHU VỰC A (BÀN TRÀ TRUNG TÂM)", type: "Ngồi", color: "#f59e0b", price: 1100000, total_quantity: 160, shape: "rect", x: 320, y: 255, width: 560, height: 110 },
      { id: "ZONE_B_LEFT", name: "KHU VỰC B (CÁNH HOÀNG HÔN TÂY)", type: "Ngồi", color: "#06b6d4", price: 850000, total_quantity: 120, shape: "rect", x: 110, y: 210, width: 180, height: 190 },
      { id: "ZONE_B_RIGHT", name: "KHU VỰC B (CÁNH ĐỒI THÔNG ĐÔNG)", type: "Ngồi", color: "#06b6d4", price: 850000, total_quantity: 120, shape: "rect", x: 910, y: 210, width: 180, height: 190 },
      { id: "STANDARD_LAWN", name: "KHU THẢM CỎ TỰ DO (LAWN)", type: "Đứng", color: "#10b981", price: 550000, total_quantity: 300, shape: "rect", x: 180, y: 420, width: 840, height: 180 }
    ]
  },

  // Mẫu 5: Outdoor Festival / Đại Nhạc Hội EDM (8 khu vực)
  {
    name: "Outdoor Festival",
    canvas: { width: 1200, height: 700, background: "#0a0b10" },
    zones: [
      { id: "STAGE", name: "MAIN STAGE MEGA", type: "Sân khấu", color: "#1e293b", shape: "rect", x: 260, y: 20, width: 680, height: 80, status: false },
      { id: "VVIP_DECK", name: "VVIP ELEVATED DECK", type: "Ngồi", color: "#a855f7", price: 4200000, total_quantity: 100, shape: "rect", x: 440, y: 125, width: 320, height: 90 },
      { id: "EDM_PIT", name: "FRONT MOSH PIT (ĐỨNG)", type: "Đứng", color: "#ef4444", price: 2100000, total_quantity: 900, shape: "rect", x: 300, y: 235, width: 600, height: 170 },
      { id: "GA_EARLY", name: "GA EARLY BIRD (ĐỨNG)", type: "Đứng", color: "#0284c7", price: 990000, total_quantity: 1200, shape: "rect", x: 80, y: 160, width: 190, height: 280 },
      { id: "GA_PHASE2", name: "GA GENERAL ADMISSION", type: "Đứng", color: "#0284c7", price: 1350000, total_quantity: 1200, shape: "rect", x: 930, y: 160, width: 190, height: 280 },
      { id: "FESTIVAL_LAWN", name: "KHU CỎ NGOẠI THÀNH & ẨM THỰC", type: "Đứng", color: "#10b981", price: 750000, total_quantity: 1500, shape: "rect", x: 160, y: 440, width: 880, height: 200 }
    ]
  }
];

// ── DANH SÁCH ẢNH BANNER CHẤT LƯỢNG CAO (16:9) ──────────────────────────────
const SAMPLE_BANNERS = [
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1766219939/po4tuuayssz8a9l0i54r.png",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1766219953/mv8grgnsbvr7ui7aioqf.png",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1773899819/ticket_concert/czdi2071cqnhabsmhfdw.jpg",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1774074908/ticket_concert/zd7yw4mm4byklnvbuts9.jpg",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1776150304/ticket_concert/udveqsfkiiqimn4h5ja1.jpg",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1776660655/ticket_concert/pthkkrotq6myfc7umuyr.jpg",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1776661475/ticket_concert/kzpwlnnkzrddkwxoqt33.jpg",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1778075866/ticket_concert/ye5plwm5qpqqkbtt42or.jpg",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1778076330/ticket_concert/fb2bk5cl8ttdedi0e7w3.jpg",
  "https://res.cloudinary.com/dzfqqipsx/image/upload/v1778076777/ticket_concert/irg6fdmmttp37ep4yj9f.jpg",
  // Unsplash Concert & Stage High-Res Photos
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1280&q=80&fit=crop",
  "https://images.unsplash.com/photo-1520523839898-507125cd53c1?w=1280&q=80&fit=crop"
];

// ── DỮ LIỆU ĐA DẠNG: 100 SỰ KIỆN ─────────────────────────────────────────────
const RAW_EVENTS = [
  // V-POP & LIVE CONCERT LỚN
  { name: "SKY TOUR 2026: SƠN TÙNG M-TP LIVE STADIUM", cat: 2, artists: ["Sơn Tùng M-TP"], actor: "M-TP Entertainment", loc: "Sân vận động Quốc gia Mỹ Đình, Hà Nội" },
  { name: "VŨ: BẢO TÀNG CỦA NUỐI TIẾC TOUR TP.HCM", cat: 2, artists: ["Vũ", "Kha"], actor: "Warner Music Vietnam", loc: "Trung tâm Hội chợ & Triển lãm Sài Gòn SECC, Q.7, TP.HCM" },
  { name: "SHOW CỦA ĐEN 2026: ĐỒNG HÀNH & NỤ CƯỜI", cat: 2, artists: ["Đen Vâu", "PiaLinh", "Lynk Lee"], actor: "Đen Production", loc: "Cung Điền kinh trong nhà, Trần Hữu Dực, Nam Từ Liêm, Hà Nội" },
  { name: "HÀ ANH TUẤN: CHÂN TRỜI RỰC RỠ - HỘI AN SPECIAL", cat: 2, artists: ["Hà Anh Tuấn", "Kitaro"], actor: "Viet Vision", loc: "Công viên Ấn tượng Hội An, Cồn Hến, Quảng Nam" },
  { name: "MỸ TÂM: LIVE CONCERT TRI ÂM 2026", cat: 2, artists: ["Mỹ Tâm", "Wowy", "Hà Anh Tuấn"], actor: "MT Entertainment", loc: "Sân vận động Quân Khu 7, Tân Bình, TP.HCM" },
  { name: "SOOBIN: BẬT NÓ LÊN LIVE ARENA CONCERT", cat: 2, artists: ["Soobin Hoàng Sơn", "Andree Right Hand"], actor: "SpaceSpeakers Group", loc: "Cung Thể Thao Quần Ngựa, Ba Đình, Hà Nội" },
  { name: "HOÀNG THÙY LINH: VIETNAMESE CONCERT 2", cat: 2, artists: ["Hoàng Thùy Linh", "Đen Vâu", "Wren Evans"], actor: "The Phoenix Production", loc: "Nhà thi đấu Phú Thọ, Quận 11, TP.HCM" },
  { name: "WREN EVANS: LOI CHOI TOUR 2026", cat: 2, artists: ["Wren Evans", "itsnk"], actor: "dmonstar", loc: "Khu đô thị Sala, TP. Thủ Đức, TP.HCM" },
  { name: "HIEUTHUHAI & GERDNANG: WE ARE GERDNANG LIVE", cat: 2, artists: ["HIEUTHUHAI", "Negav", "HURRYKNG", "Khang"], actor: "GERDNANG Music", loc: "Sân vận động Thống Nhất, Quận 10, TP.HCM" },
  { name: "MONO: 22 LIVE CONCERT & FAN MEETING", cat: 2, artists: ["MONO", "Onionn"], actor: "Muvee Media", loc: "Nhà hát Hòa Bình, Quận 10, TP.HCM" },

  // RAP & HIP-HOP
  { name: "RAP VIỆT ALL-STAR CONCERT MÙA MỚI", cat: 2, artists: ["JustaTee", "Karik", "Suboi", "B Ray", "Andree Right Hand"], actor: "Vie Channel", loc: "Trung tâm Hội chợ và Triển lãm Sài Gòn (SECC), TP.HCM" },
  { name: "SPACESPEAKERS LIVE: KOSMIK EXPERIENCE", cat: 2, artists: ["Touliver", "Binz", "Rhymastic", "SlimV", "Kimmese"], actor: "SpaceSpeakers Group", loc: "Nhà thi đấu Quân Khu 7, TP.HCM" },
  { name: "MCK: 99% TOUR LIVE CONCERT", cat: 2, artists: ["MCK", "tlinh", "Lope Dope"], actor: "RPT Studio", loc: "Cung Văn hóa Thiếu nhi Hà Nội, Hà Nội" },
  { name: "TLINH: ÁI LIVE ARENA SHOW", cat: 2, artists: ["tlinh", "24k.Right", "Wokeup"], actor: "Def Jam Vietnam", loc: "Trung tâm Sự kiện White Palace, Phạm Văn Đồng, TP.HCM" },
  { name: "B RAY: ANH BẢO LIVE CONCERT HÀ NỘI", cat: 2, artists: ["B Ray", "Captain Boy", "Khói"], actor: "EVO Music", loc: "Cung Thể thao Tiên Sơn, Đà Nẵng" },

  // INDIE, ROCK & ACOUSTIC
  { name: "CHILLIES: TRÊN NHỮNG ĐÁM MÂY LIVE IN HANOI", cat: 2, artists: ["Chillies"], actor: "Warner Music Vietnam", loc: "Cung Thể Thao Quần Ngựa, Ba Đình, Hà Nội" },
  { name: "NGỌT: NHỮNG CHUYẾN ĐI VÀ LỜI HỨA CUỐI", cat: 2, artists: ["Ngọt Band"], actor: "Ngọt Production", loc: "Sân vận động Hàng Đẫy, Đống Đa, Hà Nội" },
  { name: "BỨC TƯỜNG: BÔNG HỒNG THỦY TINH & ROCK SYMPHONY", cat: 2, artists: ["Bức Tường", "Phạm Anh Khoa"], actor: "Bức Tường Production", loc: "Nhà hát Lớn Hà Nội, Hoàn Kiếm, Hà Nội" },
  { name: "THE CASSETTE: NẾU NGÀY MAI KHÔNG ĐẾN LIVE TOUR", cat: 2, artists: ["The Cassette"], actor: "Cassette Music", loc: "Lululola Coffee, Đồi Cà Rốt, Đà Lạt" },
  { name: "THẮNG: HÁT CHO NGƯỜI ĐANG YÊU ACOUSTIC", cat: 2, artists: ["Thắng", "Quỳnh Anh"], actor: "Indie VN", loc: "Mây Lang Thang, Phường 11, Đà Lạt" },
  { name: "CÁ HỒI HOANG: TỰ DO LIVE CONCERT ENCORE", cat: 2, artists: ["Cá Hồi Hoang"], actor: "Fish Records", loc: "Nhà hát Bến Thành, Quận 1, TP.HCM" },
  { name: "THỊNH SUY: MẤY KHI LIVE IN SAIGON", cat: 2, artists: ["Thịnh Suy"], actor: "Suy Music", loc: "Soul Live Project Complex, Quận 3, TP.HCM" },

  // MÂY LANG THANG, LULULOLA & ACOUSTIC SUNSET
  { name: "MÂY LANG THANG: TRUNG QUÂN & HOÀNG HÔN ĐÀ LẠT", cat: 2, artists: ["Trung Quân Idol", "Bùi Anh Tuấn"], actor: "Mây Lang Thang Đà Lạt", loc: "Sân khấu Mây Lang Thang, Đồi Mây, Đà Lạt" },
  { name: "LULULOLA SHOW: UYÊN LINH & VĂN MAI HƯƠNG", cat: 2, artists: ["Uyên Linh", "Văn Mai Hương"], actor: "Lululola Show", loc: "Lululola Coffee+, Đèo Prenn, Đà Lạt" },
  { name: "ĐÊM NHẠC TRỊNH CÔNG SƠN: MƯA HỒNG & BIỂN NHỚ", cat: 2, artists: ["Cẩm Vân", "Hồng Nhung", "Quang Dũng"], actor: "Gia đình Nhạc sĩ Trịnh Công Sơn", loc: "Nhà Hát Thành Phố, Quận 1, TP.HCM" },
  { name: "ACOUSTIC TRÊN MÂY: NGUYÊN HÀ & LÂN NHÃ", cat: 2, artists: ["Nguyên Hà", "Lân Nhã"], actor: "Mây Sunset Live", loc: "Quảng trường Lâm Viên, Đà Lạt" },
  { name: "SUNSET BY THE SEA: QUỐC THIÊN & LỆ QUYÊN", cat: 2, artists: ["Quốc Thiên", "Lệ Quyên"], actor: "Sunset Town Phú Quốc", loc: "Thị trấn Hoàng Hôn, An Thới, Phú Quốc" },

  // FESTIVALS & ĐẠI HỘI ÂM NHẠC
  { name: "MONSOON MUSIC FESTIVAL 2026 (GIÓ MÙA)", cat: 1, artists: ["Thanh Lam", "Suboi", "Hyukoh", "Sunset Rollercoaster"], actor: "Thanh Việt Production", loc: "Hoàng Thành Thăng Long, Ba Đình, Hà Nội" },
  { name: "RAVOLUTION MUSIC FESTIVAL 2026: RAVE ON", cat: 1, artists: ["Alan Walker", "Don Diablo", "K-391"], actor: "Ravolution Asia", loc: "Khu đô thị Vạn Phúc City, TP. Thủ Đức, TP.HCM" },
  { name: "CREAMFIELDS VIETNAM 2026: EDM UNIVERSE", cat: 1, artists: ["Hardwell", "W&W", "Kaaze"], actor: "Live Nation & Ravolution", loc: "Bãi biển Bãi Dài, Cam Ranh, Nha Trang" },
  { name: "HOZO MUSIC FESTIVAL: HÒ DÔ QUỐC TẾ 2026", cat: 1, artists: ["Mỹ Anh", "Soobin", "Boney M."], actor: "Sở Văn hóa & Thể thao TP.HCM", loc: "Phố Đi Bộ Nguyễn Huệ & Công viên Bến Bạch Đằng, TP.HCM" },
  { name: "HẠ LONG BAY MUSIC CARNIVAL 2026", cat: 1, artists: ["Tuấn Hưng", "Hồ Ngọc Hà", "Đức Phúc"], actor: "Sun Group Event", loc: "Quảng trường Sun Carnival Plaza, Bãi Cháy, Hạ Long" },
  { name: "ĐÀ NẴNG COUNTDOWN & LIGHT FESTIVAL", cat: 1, artists: ["Noo Phước Thịnh", "Tóc Tiên", "Trúc Nhân"], actor: "UBND TP. Đà Nẵng", loc: "Quảng trường 29/3, Đường 2/9, Hải Châu, Đà Nẵng" },
  { name: "FESTIVAL BIỂN NHA TRANG: NHỊP ĐẬP ĐẠI DƯƠNG", cat: 1, artists: ["Văn Mai Hương", "Quang Vinh", "Isaac"], actor: "Sở Văn Hóa Khánh Hòa", loc: "Quảng trường 2/4, Đường Trần Phú, Nha Trang" },
  { name: "CẦN THƠ RIVER FESTIVAL: ĐÊM SÔNG HẬU HUYỀN DIỆU", cat: 1, artists: ["Đan Trường", "Cẩm Ly", "Quốc Đại"], actor: "Sở Du Lịch Cần Thơ", loc: "Bến Ninh Kiều, Ninh Kiều, Cần Thơ" },

  // KỊCH & NHÀ HÁT NGHỆ THUẬT
  { name: "IDECAF: TẤM CÁM ĐẠI CHIẾN PHẦN 2", cat: 3, artists: ["NSƯT Thành Lộc", "Hữu Châu", "Đại Nghĩa"], actor: "Sân khấu kịch IDECAF", loc: "Nhà hát Bến Thành, 6 Mạc Đĩnh Chi, Quận 1, TP.HCM" },
  { name: "VỞ KỊCH KINH ĐIỂN: DẠ CỔ HOÀI LANG", cat: 3, artists: ["NSƯT Hoài Linh", "NSƯT Việt Hương", "Hữu Châu"], actor: "Sân Khấu Kịch 5B Võ Văn Tần", loc: "Sân khấu kịch 5B, Quận 3, TP.HCM" },
  { name: "VỞ KỊCH LỊCH SỬ: BÍ MẬT VƯỜN LỆ CHI", cat: 3, artists: ["NSND Hồng Vân", "NSƯT Kim Tử Long"], actor: "Sân Khấu Kịch Hồng Vân", loc: "Nhà Văn hóa Sinh viên, Đại học Quốc gia, TP.HCM" },
  { name: "NHẠC KỊCH DẾ MÈN PHIÊU LƯU KÝ (MUSICAL)", cat: 3, artists: ["Dàn hợp xướng HBSO", "Nhạc trưởng Trần Nhật Minh"], actor: "Nhà hát Giao hưởng Nhạc Vũ Kịch HBSO", loc: "Nhà Hát Lớn Hà Nội, Hoàn Kiếm, Hà Nội" },
  { name: "VỞ HÀI KỊCH: CƯỚI GIÙM KẺ KHÁC", cat: 3, artists: ["Thu Trang", "Tiến Luật", "Huỳnh Lập"], actor: "Sân Khấu Thế Giới Trẻ", loc: "Sân khấu Thế Giới Trẻ, 125 Cống Quỳnh, Quận 1, TP.HCM" },
  { name: "OPERA CARMEN: HUYỀN THOẠI SEVILLE", cat: 3, artists: ["Dàn nhạc Giao hưởng Quốc Gia VNSO"], actor: "Nhà hát Ca Múa Nhạc Việt Nam", loc: "Nhà Hát Lớn Hà Nội, Tràng Tiền, Hà Nội" },
  { name: "KỊCH TÂM LÝ: NGƯỜI VỢ MA 2026", cat: 3, artists: ["NSND Hồng Vân", "Thái Hòa"], actor: "Sân Khấu Phú Nhuận", loc: "Sân khấu kịch Phú Nhuận, Hoàng Văn Thụ, TP.HCM" },
  { name: "VỞ DIỄN NGHỆ THUẬT: TỎI VÀ NƯỚC MẮT", cat: 3, artists: ["Thành Lộc", "Phương Dung"], actor: "Thiên Đăng Drama Club", loc: "Sân khấu kịch Thiên Đăng, Quận 1, TP.HCM" }
];

// Danh sách ca sĩ phong phú bổ sung
const ARTIST_POOL = [
  "Sơn Tùng M-TP", "Mỹ Tâm", "Đen Vâu", "Hà Anh Tuấn", "Vũ", "Hoàng Thùy Linh", "Soobin", "Wren Evans",
  "HIEUTHUHAI", "MONO", "tlinh", "MCK", "Đức Phúc", "Erik", "Trúc Nhân", "Văn Mai Hương", "Bích Phương",
  "Noo Phước Thịnh", "Uyên Linh", "Trung Quân Idol", "Lệ Quyên", "Quốc Thiên", "Bùi Anh Tuấn", "Chillies",
  "Ngọt", "Bức Tường", "JustaTee", "Karik", "Suboi", "Andree Right Hand", "B Ray", "Phan Mạnh Quỳnh",
  "Hòa Minzy", "Grey D", "Amee", "Phương Ly", "Vũ Cát Tường", "Khắc Hưng", "Jack - J97", "Kay Trần",
  "Phùng Khánh Linh", "Thịnh Suy", "Cá Hồi Hoang", "The Cassette", "7UPPERCUTS", "Nguyên Hà", "Lân Nhã"
];

const LOCATIONS_POOL = [
  "Sân vận động Quốc gia Mỹ Đình, Đường Lê Đức Thọ, Nam Từ Liêm, Hà Nội",
  "Khu đô thị Vạn Phúc City, Quốc lộ 13, Hiệp Bình Phước, TP. Thủ Đức, TP.HCM",
  "Sân vận động Quân Khu 7, 202 Hoàng Văn Thụ, Phường 9, Phú Nhuận, TP.HCM",
  "Trung tâm Hội chợ và Triển lãm Sài Gòn (SECC), 799 Nguyễn Văn Linh, Quận 7, TP.HCM",
  "Cung Điền kinh trong nhà Hà Nội, Phố Trần Hữu Dực, Nam Từ Liêm, Hà Nội",
  "Cung Thể Thao Quần Ngựa, 30 Văn Cao, Liễu Giai, Ba Đình, Hà Nội",
  "Cung Thể Thao Tiên Sơn, Đường Phan Đăng Lưu, Hòa Cường Bắc, Hải Châu, Đà Nẵng",
  "Quảng trường Lâm Viên, Trần Quốc Toản, Phường 1, Đà Lạt, Lâm Đồng",
  "Nhà Hát Hòa Bình, 240 Đường 3 Tháng 2, Phường 12, Quận 10, TP.HCM",
  "Nhà Hát Lớn Hà Nội, 1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
  "Nhà Hát Thành Phố, 7 Công Trường Lam Sơn, Bến Nghé, Quận 1, TP.HCM",
  "Quảng trường Sun Carnival Plaza, Đường Hạ Long, Bãi Cháy, TP. Hạ Long",
  "Thị trấn Hoàng Hôn Sunset Town, Phường An Thới, TP. Phú Quốc, Kiên Giang",
  "Quảng trường 2/4, Đường Trần Phú, Lộc Thọ, TP. Nha Trang, Khánh Hòa",
  "Công viên Lưu Hữu Phước, Đại Lộ Hòa Bình, Ninh Kiều, Cần Thơ"
];

const ACTORS_POOL = [
  "Vie Channel", "M-TP Entertainment", "Viet Vision Production", "SpaceSpeakers Group",
  "Warner Music Vietnam", "Sony Music Entertainment VN", "Universal Music Vietnam",
  "Mây Lang Thang Entertainment", "Lululola Media", "The Phoenix Group", "Live Nation Vietnam",
  "Sở Văn Hóa & Du Lịch", "Idecaf Drama Production", "HBSO Symphony Orchestra", "Sun Group Entertainment"
];

// Hàm tạo 100 sự kiện hoàn chỉnh
function generate100Events() {
  const events = [];

  // 1. Thêm các sự kiện đặc sắc có tên cụ thể trước
  RAW_EVENTS.forEach((e, idx) => {
    const banner = SAMPLE_BANNERS[idx % SAMPLE_BANNERS.length];
    const layout = LAYOUT_TEMPLATES[idx % LAYOUT_TEMPLATES.length];
    const artists = e.artists.map(name => ({ name }));

    const startMonth = 5 + (idx % 8); // Tháng 5 đến 12 năm 2026
    const startDay = 1 + ((idx * 3) % 27);
    const startHour = 18 + (idx % 3);
    const endDay = Math.min(startDay + (idx % 2 === 0 ? 0 : 2), 28);

    const startStr = `2026-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} ${startHour}:30:00`;
    const endStr = `2026-${String(startMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')} 23:00:00`;

    events.push({
      name: e.name,
      description: `Đại tiệc âm nhạc & nghệ thuật đỉnh cao "${e.name}". Sự kiện quy tụ những nghệ sĩ hàng đầu với hệ thống âm thanh, ánh sáng chuẩn quốc tế, hứa hẹn mang đến một đêm thăng hoa cảm xúc khó quên cho toàn thể khán giả!`,
      location: e.loc,
      age: idx % 4 === 0 ? 12 : (idx % 3 === 0 ? 18 : 16),
      banner_url: banner,
      category_id: e.cat,
      event_start: startStr,
      event_end: endStr,
      event_status: true,
      event_actor: e.actor,
      event_artist: JSON.stringify(artists),
      layout_template: layout
    });
  });

  // 2. Sinh thêm các sự kiện chủ đề hấp dẫn cho đủ 100 sự kiện
  const themes = [
    { prefix: "LIVE TOUR 2026", suffix: "THE SOUND OF PASSION" },
    { prefix: "CONCERT ĐÊM NHẠC", suffix: "BẦU TRỜI & KỶ NIỆM" },
    { prefix: "ACOUSTIC NIGHT", suffix: "GIAI ĐIỆU HOÀNG HÔN" },
    { prefix: "EDM FESTIVAL", suffix: "BEYOND THE HORIZON" },
    { prefix: "VỞ KỊCH ĐẶC SẮC", suffix: "ÁNH ĐÈN SÂN KHẤU" },
    { prefix: "MUSIC GALA", suffix: "THANH XUÂN CỦA CHÚNG TA" },
    { prefix: "FAN CONCERT", suffix: "ONE LOVE, ONE VOICE" },
    { prefix: "SYMPHONY NIGHT", suffix: "BẢN GIAO HƯỞNG THÁNG NĂM" }
  ];

  let currentCount = events.length;
  while (events.length < 100) {
    const i = events.length;
    const artistMain = ARTIST_POOL[i % ARTIST_POOL.length];
    const artistFeat = ARTIST_POOL[(i + 7) % ARTIST_POOL.length];
    const theme = themes[i % themes.length];
    const catId = i % 10 === 0 ? 3 : (i % 7 === 0 ? 1 : 2); // Phân bổ ca nhạc (chính), kịch, đại hội
    const loc = LOCATIONS_POOL[i % LOCATIONS_POOL.length];
    const actor = ACTORS_POOL[i % ACTORS_POOL.length];
    const banner = SAMPLE_BANNERS[i % SAMPLE_BANNERS.length];
    const layout = LAYOUT_TEMPLATES[i % LAYOUT_TEMPLATES.length];

    const startMonth = 5 + (i % 8);
    const startDay = 1 + ((i * 4) % 27);
    const startHour = 19 + (i % 2);
    const startStr = `2026-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} ${startHour}:00:00`;
    const endStr = `2026-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} 23:30:00`;

    const eventTitle = catId === 3 
      ? `VỞ KỊCH KINH ĐIỂN: ${artistMain.toUpperCase()} & ${theme.suffix}`
      : `${artistMain.toUpperCase()}: ${theme.prefix} - ${theme.suffix} (VOL ${Math.floor(i / 10) + 1})`;

    events.push({
      name: eventTitle,
      description: `Chào mừng bạn đến với sự kiện nghệ thuật quy mô lớn "${eventTitle}". Đêm diễn được dàn dựng công phu với sự tham gia biểu diễn của ${artistMain} cùng khách mời đặc biệt ${artistFeat}. Một trải nghiệm thị giác và thính giác bùng nổ đang chờ đón bạn!`,
      location: loc,
      age: 16,
      banner_url: banner,
      category_id: catId,
      event_start: startStr,
      event_end: endStr,
      event_status: true,
      event_actor: actor,
      event_artist: JSON.stringify([{ name: artistMain }, { name: artistFeat }]),
      layout_template: layout
    });
  }

  return events;
}

// ── HÀM CHẠY SEED VÀO DATABASE ────────────────────────────────────────────────
async function seedAll() {
  const client = await pool.connect();
  console.log("🚀 Bắt đầu quá trình nạp 100 sự kiện mẫu và các sơ đồ ghế...");

  try {
    await client.query("BEGIN");

    const eventList = generate100Events();
    console.log(`📋 Đã sinh ${eventList.length} sự kiện mẫu. Đang tiến hành ghi vào Database...`);

    let insertedEventsCount = 0;
    let insertedZonesCount = 0;

    for (let i = 0; i < eventList.length; i++) {
      const ev = eventList[i];

      // 1. Thêm Sự kiện
      const insertEventQuery = `
        INSERT INTO events (
          event_name,
          event_description,
          event_location,
          event_age,
          banner_url,
          category_id,
          event_start,
          event_end,
          event_status,
          event_actor,
          event_artist,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING event_id, event_name;
      `;

      const evRes = await client.query(insertEventQuery, [
        ev.name,
        ev.description,
        ev.location,
        ev.age,
        ev.banner_url,
        ev.category_id,
        ev.event_start,
        ev.event_end,
        ev.event_status,
        ev.event_actor,
        ev.event_artist
      ]);

      const eventId = evRes.rows[0].event_id;
      insertedEventsCount++;

      // 2. Thêm Layout sơ đồ ghế cho sự kiện
      const layoutData = {
        canvas: ev.layout_template.canvas,
        zones: ev.layout_template.zones
      };

      await client.query(
        "INSERT INTO layout (layout_json, event_id) VALUES ($1, $2)",
        [JSON.stringify(layoutData), eventId]
      );

      // 3. Thêm các Khu Vực / Hàng Ghế (Zones) tương ứng
      const validZones = ev.layout_template.zones.filter(
        z => z.price && z.total_quantity && z.status !== false
      );

      for (const z of validZones) {
        // Tạo lượng vé đã bán ngẫu nhiên (10% - 60% số lượng vé) để giao diện có dữ liệu thực tế
        const soldPercentage = 0.1 + Math.random() * 0.5;
        const soldQty = Math.floor(z.total_quantity * soldPercentage);

        const insertZoneQuery = `
          INSERT INTO zones (
            event_id,
            zone_code,
            zone_name,
            zone_description,
            zone_quantity,
            sold_quantity,
            zone_price,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await client.query(insertZoneQuery, [
          eventId,
          z.id,
          z.name,
          `${z.type} - Khu vực khán đài chính thức`,
          z.total_quantity,
          soldQty,
          z.price,
          true
        ]);
        insertedZonesCount++;
      }

      if ((i + 1) % 20 === 0 || i === eventList.length - 1) {
        console.log(`✅ Đã thêm ${i + 1}/${eventList.length} sự kiện và các hàng ghế...`);
      }
    }

    await client.query("COMMIT");
    console.log("\n🎉 HOÀN THÀNH XUẤT SẮC!");
    console.log(`👉 Tổng số sự kiện mới đã thêm: ${insertedEventsCount}`);
    console.log(`👉 Tổng số hàng ghế / khu vực (zones) đã tạo: ${insertedZonesCount}`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi trong quá trình nạp dữ liệu:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedAll();
