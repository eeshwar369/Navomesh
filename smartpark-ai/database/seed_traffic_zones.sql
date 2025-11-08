-- Sample Traffic Zones for Geo-Tagging (Mumbai, India)
-- These zones represent key traffic areas in the city

USE smartpark_db;

-- Insert Traffic Zones
INSERT INTO traffic_zones (zone_name, zone_code, center_latitude, center_longitude, radius_meters, area, description) VALUES
('Bandra West Junction', 'BWJ-001', 19.0596, 72.8295, 500, 'Bandra', 'High traffic area near Bandra station'),
('Andheri Link Road', 'ALR-002', 19.1136, 72.8697, 600, 'Andheri', 'Major connecting road with heavy traffic'),
('Lower Parel Flyover', 'LPF-003', 18.9988, 72.8299, 450, 'Lower Parel', 'Business district flyover'),
('Dadar TT Junction', 'DTT-004', 19.0176, 72.8485, 550, 'Dadar', 'Central Mumbai junction'),
('Worli Sea Link Entry', 'WSL-005', 19.0176, 72.8170, 400, 'Worli', 'Bandra-Worli sea link entry point'),
('Powai Junction', 'POW-006', 19.1168, 72.9050, 500, 'Powai', 'IT hub area junction'),
('Goregaon Highway', 'GGH-007', 19.1651, 72.8489, 700, 'Goregaon', 'Western Express Highway section'),
('Kurla Station Road', 'KSR-008', 19.0688, 72.8794, 450, 'Kurla', 'Railway station approach road'),
('Churchgate Circle', 'CGC-009', 18.9320, 72.8264, 350, 'Churchgate', 'South Mumbai business area'),
('Vashi Bridge', 'VBR-010', 19.0607, 72.9932, 600, 'Vashi', 'Navi Mumbai bridge entry'),
('BKC Junction', 'BKC-011', 19.0644, 72.8687, 500, 'BKC', 'Bandra Kurla Complex business area'),
('Phoenix Mall Junction', 'PMJ-012', 18.9938, 72.8279, 400, 'Lower Parel', 'Mall area high traffic zone'),
('Santacruz Airport Road', 'SAR-013', 19.0896, 72.8656, 550, 'Santacruz', 'Airport approach road'),
('Sion Circle', 'SIC-014', 19.0433, 72.8627, 500, 'Sion', 'Major traffic circle'),
('Mulund Check Naka', 'MCN-015', 19.1722, 72.9565, 650, 'Mulund', 'City entry point with high traffic');

-- Insert Sample Historical Traffic Data for ML Training
INSERT INTO traffic_history (zone_id, latitude, longitude, congestion_level, avg_speed, vehicle_count, hour_of_day, day_of_week, is_holiday) VALUES
-- Zone 1: Bandra West Junction - Peak hours high traffic
(1, 19.0596, 72.8295, 'high', 15.5, 450, 8, 1, FALSE),
(1, 19.0596, 72.8295, 'critical', 10.2, 520, 9, 1, FALSE),
(1, 19.0596, 72.8295, 'high', 18.3, 480, 17, 1, FALSE),
(1, 19.0596, 72.8295, 'critical', 12.1, 550, 18, 1, FALSE),
(1, 19.0596, 72.8295, 'medium', 35.5, 280, 14, 1, FALSE),
(1, 19.0596, 72.8295, 'low', 45.2, 150, 23, 1, FALSE),

-- Zone 2: Andheri Link Road - Always busy
(2, 19.1136, 72.8697, 'critical', 8.5, 600, 8, 2, FALSE),
(2, 19.1136, 72.8697, 'high', 14.2, 550, 9, 2, FALSE),
(2, 19.1136, 72.8697, 'critical', 11.5, 580, 18, 2, FALSE),
(2, 19.1136, 72.8697, 'medium', 28.3, 320, 14, 2, FALSE),
(2, 19.1136, 72.8697, 'low', 42.1, 180, 2, 2, FALSE),

-- Zone 3: Lower Parel Flyover - Business hours traffic
(3, 18.9988, 72.8299, 'critical', 12.3, 520, 9, 3, FALSE),
(3, 18.9988, 72.8299, 'high', 19.5, 450, 10, 3, FALSE),
(3, 18.9988, 72.8299, 'critical', 13.8, 500, 18, 3, FALSE),
(3, 18.9988, 72.8299, 'medium', 32.5, 280, 15, 3, FALSE),
(3, 18.9988, 72.8299, 'low', 48.2, 120, 22, 3, FALSE),

-- Zone 4: Dadar TT Junction - Central hub
(4, 19.0176, 72.8485, 'high', 16.5, 480, 8, 4, FALSE),
(4, 19.0176, 72.8485, 'critical', 11.2, 540, 9, 4, FALSE),
(4, 19.0176, 72.8485, 'high', 17.8, 490, 17, 4, FALSE),
(4, 19.0176, 72.8485, 'medium', 30.5, 300, 13, 4, FALSE),
(4, 19.0176, 72.8485, 'low', 43.5, 160, 1, 4, FALSE),

-- Zone 5: Worli Sea Link Entry - Tourist area
(5, 19.0176, 72.8170, 'medium', 25.5, 320, 8, 5, FALSE),
(5, 19.0176, 72.8170, 'high', 18.2, 420, 9, 5, FALSE),
(5, 19.0176, 72.8170, 'high', 19.5, 450, 18, 5, FALSE),
(5, 19.0176, 72.8170, 'medium', 28.3, 280, 14, 5, FALSE),
(5, 19.0176, 72.8170, 'low', 50.2, 140, 3, 5, FALSE),

-- Weekend data (Saturday=5, Sunday=6)
(1, 19.0596, 72.8295, 'medium', 32.5, 250, 10, 5, FALSE),
(1, 19.0596, 72.8295, 'low', 45.2, 180, 14, 6, FALSE),
(2, 19.1136, 72.8697, 'medium', 28.5, 280, 11, 5, FALSE),
(3, 18.9988, 72.8299, 'low', 42.5, 160, 15, 6, FALSE);

-- Insert Sample Current Traffic Data
INSERT INTO traffic_data (area_name, latitude, longitude, congestion_level, avg_speed, vehicle_count) VALUES
('Bandra West Junction', 19.0596, 72.8295, 'high', 18.5, 480),
('Andheri Link Road', 19.1136, 72.8697, 'critical', 12.2, 580),
('Lower Parel Flyover', 18.9988, 72.8299, 'high', 19.8, 450),
('Dadar TT Junction', 19.0176, 72.8485, 'medium', 28.5, 320),
('Worli Sea Link Entry', 19.0176, 72.8170, 'low', 45.2, 180),
('Powai Junction', 19.1168, 72.9050, 'medium', 32.5, 290),
('Goregaon Highway', 19.1651, 72.8489, 'high', 22.3, 420),
('Kurla Station Road', 19.0688, 72.8794, 'critical', 10.5, 550),
('Churchgate Circle', 18.9320, 72.8264, 'medium', 25.8, 310),
('Vashi Bridge', 19.0607, 72.9932, 'high', 20.5, 460),
('BKC Junction', 19.0644, 72.8687, 'critical', 15.2, 520),
('Phoenix Mall Junction', 18.9938, 72.8279, 'high', 18.8, 470),
('Santacruz Airport Road', 19.0896, 72.8656, 'critical', 13.5, 540),
('Sion Circle', 19.0433, 72.8627, 'medium', 30.2, 280),
('Mulund Check Naka', 19.1722, 72.9565, 'high', 21.5, 440);
