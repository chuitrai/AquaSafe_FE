
// API Configuration
export const API_BASE_URL = "http://localhost:8220/api";
export const HUE_CENTER = { lat: 16.4637, lng: 107.5909 };

// --- HELPER FUNCTIONS ---

export const getRandomCoord = () => {
    const lat = HUE_CENTER.lat + (Math.random() - 0.5) * 0.06; // +/- ~3km
    const lng = HUE_CENTER.lng + (Math.random() - 0.5) * 0.08;
    return [lat, lng];
};

export const getAuthHeaders = (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// --- CONVEX HULL ALGORITHM (Monotone Chain) ---
export const getConvexHull = (points) => {
    if (points.length < 3) return points;

    const sortedPoints = [...points].sort((a, b) => {
        return a.lon === b.lon ? a.lat - b.lat : a.lon - b.lon;
    });

    const crossProduct = (o, a, b) => {
        return (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
    };

    const lower = [];
    for (const point of sortedPoints) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }
        lower.push(point);
    }

    const upper = [];
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
        const point = sortedPoints[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }
        upper.push(point);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
};

// --- MOCK DATA ---

export const MOCK_DEMO_ZONES = [
  {
    id: 'DEMO_01',
    location: 'Phường Vĩnh Ninh (Demo L1)',
    district: 'Thừa Thiên Huế',
    level: '0.25', // Level 1 (0.10 - 0.30)
    severity: 'medium', 
    status: 'stable',
    timestamp: Date.now(),
    bounds: { minlat: 16.455, maxlat: 16.460, minlon: 107.585, maxlon: 107.590 }
  },
  {
    id: 'DEMO_02',
    location: 'Phường Thuận Lộc (Demo L2)',
    district: 'Thừa Thiên Huế',
    level: '0.45', // Level 2 (0.31 - 0.50)
    severity: 'medium',
    status: 'rising',
    timestamp: Date.now(),
    bounds: { minlat: 16.470, maxlat: 16.475, minlon: 107.580, maxlon: 107.585 }
  },
  {
    id: 'DEMO_03',
    location: 'Phường Phú Hậu (Demo L3)',
    district: 'Thừa Thiên Huế',
    level: '0.80', // Level 3 (0.51 - 1.00)
    severity: 'high',
    status: 'rising',
    timestamp: Date.now(),
    bounds: { minlat: 16.465, maxlat: 16.470, minlon: 107.600, maxlon: 107.605 }
  },
  {
    id: 'DEMO_04',
    location: 'Phường Xuân Phú (Demo L4)',
    district: 'Thừa Thiên Huế',
    level: '1.50', // Level 4 (1.01 - 2.00)
    severity: 'critical',
    status: 'rising',
    timestamp: Date.now(),
    bounds: { minlat: 16.455, maxlat: 16.460, minlon: 107.605, maxlon: 107.610 }
  },
  {
    id: 'DEMO_05',
    location: 'Phường Hương Sơ (Demo L5)',
    district: 'Thừa Thiên Huế',
    level: '2.50', // Level 5 (> 2.00)
    severity: 'critical',
    status: 'rising',
    timestamp: Date.now(),
    bounds: { minlat: 16.480, maxlat: 16.485, minlon: 107.575, maxlon: 107.580 }
  }
];

export const MOCK_RESCUE_TEAMS = [
    { id: 'RT01', name: 'Đội CH Phường Phú Hội', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT02', name: 'Cảnh sát PCCC & CNCH', type: 'truck', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT03', name: 'Tổ Phản ứng nhanh 115', type: 'ambulance', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT04', name: 'Đội TNV Chữ Thập Đỏ', type: 'medical', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT05', name: 'Ban CHQS TP Huế', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT06', name: 'Đội CH Vỹ Dạ', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT07', name: 'Đội Hậu Cần Quân Khu 4', type: 'truck', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT08', name: 'Biệt đội Cano 01', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT09', name: 'Y tế Phường Xuân Phú', type: 'medical', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT10', name: 'Đội CH An Cựu', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT11', name: 'CSGT Đường Thủy', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT12', name: 'Đội Xe Lội Nước', type: 'truck', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT13', name: 'TNV Áo Xanh Huế', type: 'medical', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT14', name: 'Đội CH Phường Đúc', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT15', name: 'Trung tâm Cấp cứu 115 #2', type: 'ambulance', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT16', name: 'Đội CH Kim Long', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT17', name: 'Hải Đội 2 Biên Phòng', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT18', name: 'Tổ Công Tác Đặc Biệt', type: 'truck', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT19', name: 'Y Tế Lưu Động Số 3', type: 'medical', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT20', name: 'Đội CH Thuận An', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
];

export const MOCK_RELIEF_POINTS = [
    { id: 'RP01', name: 'BV Trung Ương Huế', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP02', name: 'Trường Quốc Học Huế', type: 'shelter', capacity: '300/500', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP03', name: 'UBND Phường Vỹ Dạ', type: 'food', capacity: 'Còn 200 suất', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP04', name: 'Nhà Văn Hóa Lao Động', type: 'shelter', capacity: '150/300', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP05', name: 'Trung tâm Y tế TP Huế', type: 'hospital', capacity: 'Quá tải nhẹ', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP06', name: 'Kho Gạo Dự Trữ', type: 'food', capacity: 'Đầy kho', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP07', name: 'Trường THPT Hai Bà Trưng', type: 'shelter', capacity: '50/400', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP08', name: 'Chùa Thiên Mụ', type: 'shelter', capacity: '100/200', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP09', name: 'BV Đại Học Y Dược', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP10', name: 'Siêu thị Go! (Điểm tiếp tế)', type: 'food', capacity: 'Hoạt động', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP11', name: 'UBND Phường Xuân Phú', type: 'shelter', capacity: 'Đầy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP12', name: 'Trạm Y Tế An Cựu', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP13', name: 'Nhà Thờ Phủ Cam', type: 'shelter', capacity: '200/600', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP14', name: 'Kho Hậu Cần QK4', type: 'food', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP15', name: 'Trường ĐH Khoa Học', type: 'shelter', capacity: '10/1000', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP16', name: 'BV Quốc Tế Huế', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP17', name: 'Điểm phát mỳ tôm Hương Sơ', type: 'food', capacity: 'Còn 50 thùng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP18', name: 'Đại Học Sư Phạm', type: 'shelter', capacity: '500/800', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP19', name: 'Trạm Y Tế Kim Long', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP20', name: 'Chợ Đông Ba (Điểm tập kết)', type: 'food', capacity: 'Đang nhập', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
];
