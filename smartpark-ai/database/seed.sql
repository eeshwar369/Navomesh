-- SmartPark AI Seed Data
-- Sample data for demonstration

USE smartpark_db;

-- Insert Demo Users
INSERT INTO users (name, email, password, role, phone) VALUES
('Admin User', 'admin@smartpark.com', '$2a$10$rN3K8xZ5JYvxJx5F5X8Z5eQn5X8Z5JYvxJx5F5X8Z5eQn5X8Z5JYvx', 'admin', '+91-9876543210'),
('John Doe', 'user@smartpark.com', '$2a$10$rN3K8xZ5JYvxJx5F5X8Z5eQn5X8Z5JYvxJx5F5X8Z5eQn5X8Z5JYvx', 'user', '+91-9876543211'),
('Sarah Smith', 'sarah@example.com', '$2a$10$rN3K8xZ5JYvxJx5F5X8Z5eQn5X8Z5JYvxJx5F5X8Z5eQn5X8Z5JYvx', 'user', '+91-9876543212'),
('Mike Johnson', 'mike@example.com', '$2a$10$rN3K8xZ5JYvxJx5F5X8Z5eQn5X8Z5JYvxJx5F5X8Z5eQn5X8Z5JYvx', 'user', '+91-9876543213');

-- Insert Parking Slots (Mumbai locations)
INSERT INTO parking_slots (name, location, latitude, longitude, total_capacity, occupied_slots, hourly_rate, area, status) VALUES
-- South Mumbai
('Gateway of India Parking', 'Gateway of India, Mumbai', 18.9220, 72.8347, 100, 75, 60.00, 'South Mumbai', 'available'),
('Marine Drive Parking', 'Marine Drive, Mumbai', 18.9432, 72.8236, 80, 65, 80.00, 'South Mumbai', 'available'),
('Colaba Market Parking', 'Colaba Causeway, Mumbai', 18.9067, 72.8147, 60, 58, 50.00, 'South Mumbai', 'full'),
('Nariman Point Lot', 'Nariman Point, Mumbai', 18.9254, 72.8243, 120, 45, 100.00, 'South Mumbai', 'available'),

-- Central Mumbai
('Dadar Station Parking', 'Dadar West, Mumbai', 19.0176, 72.8431, 150, 120, 40.00, 'Central Mumbai', 'available'),
('BKC Plaza Parking', 'Bandra Kurla Complex', 19.0625, 72.8691, 200, 85, 120.00, 'Central Mumbai', 'available'),
('Worli Sea Face Parking', 'Worli Sea Face, Mumbai', 19.0075, 72.8169, 70, 35, 70.00, 'Central Mumbai', 'available'),
('Lower Parel Mall', 'Lower Parel, Mumbai', 18.9958, 72.8302, 250, 200, 60.00, 'Central Mumbai', 'available'),

-- Western Suburbs
('Juhu Beach Parking', 'Juhu Beach, Mumbai', 19.0897, 72.8267, 100, 90, 50.00, 'Western Suburbs', 'available'),
('Andheri Metro Station', 'Andheri West, Mumbai', 19.1197, 72.8464, 180, 145, 40.00, 'Western Suburbs', 'available'),
('Goregaon Mall Parking', 'Goregaon East, Mumbai', 19.1648, 72.8505, 300, 210, 50.00, 'Western Suburbs', 'available'),
('Malad Station Lot', 'Malad West, Mumbai', 19.1867, 72.8479, 120, 95, 35.00, 'Western Suburbs', 'available'),

-- Eastern Suburbs
('Ghatkopar Metro Parking', 'Ghatkopar West, Mumbai', 19.0862, 72.9081, 150, 110, 40.00, 'Eastern Suburbs', 'available'),
('Vikhroli Tech Park', 'Vikhroli East, Mumbai', 19.1026, 72.9343, 200, 160, 60.00, 'Eastern Suburbs', 'available'),
('Mulund Station Parking', 'Mulund West, Mumbai', 19.1722, 72.9565, 100, 75, 35.00, 'Eastern Suburbs', 'available'),
('Thane Plaza Parking', 'Thane West, Mumbai', 19.2183, 72.9781, 180, 140, 45.00, 'Eastern Suburbs', 'available');

-- Insert Traffic Data
INSERT INTO traffic_data (area_name, latitude, longitude, congestion_level, avg_speed, vehicle_count) VALUES
('Gateway of India', 18.9220, 72.8347, 'high', 15.5, 450),
('Marine Drive', 18.9432, 72.8236, 'medium', 25.0, 320),
('Colaba', 18.9067, 72.8147, 'critical', 8.2, 580),
('Nariman Point', 18.9254, 72.8243, 'high', 18.5, 420),
('Dadar', 19.0176, 72.8431, 'critical', 10.5, 650),
('BKC', 19.0625, 72.8691, 'medium', 30.0, 280),
('Worli', 19.0075, 72.8169, 'high', 20.0, 400),
('Lower Parel', 18.9958, 72.8302, 'high', 22.0, 380),
('Juhu', 19.0897, 72.8267, 'medium', 28.0, 250),
('Andheri', 19.1197, 72.8464, 'critical', 12.0, 620),
('Goregaon', 19.1648, 72.8505, 'medium', 32.0, 240),
('Malad', 19.1867, 72.8479, 'high', 19.0, 410),
('Ghatkopar', 19.0862, 72.9081, 'high', 21.0, 390),
('Vikhroli', 19.1026, 72.9343, 'low', 40.0, 150),
('Mulund', 19.1722, 72.9565, 'medium', 30.0, 220),
('Thane', 19.2183, 72.9781, 'high', 23.0, 370);

-- Insert Sample Reports
INSERT INTO reports (user_id, slot_id, report_type, status, description) VALUES
(2, 1, 'available', 'verified', '10 spots free near entrance'),
(3, 2, 'occupied', 'verified', 'Almost full, only 2-3 spots left'),
(4, 3, 'full', 'verified', 'Completely full, cars waiting'),
(2, 5, 'available', 'pending', 'Good availability on 2nd floor'),
(3, 8, 'available', 'verified', 'Plenty of space available');

-- Insert User Rewards
INSERT INTO user_rewards (user_id, total_reports, verified_reports, points, level) VALUES
(2, 15, 12, 240, 'Gold'),
(3, 8, 7, 140, 'Silver'),
(4, 3, 2, 40, 'Bronze');

-- Insert Sample Predictions (ML model would generate these)
INSERT INTO predictions (slot_id, predicted_occupancy, prediction_hour, day_of_week, confidence_score) VALUES
(1, 85.5, 9, 1, 0.92),
(1, 92.3, 18, 1, 0.89),
(2, 78.2, 9, 1, 0.91),
(2, 88.5, 18, 1, 0.87),
(5, 95.1, 9, 1, 0.94),
(5, 98.2, 18, 1, 0.93),
(8, 72.3, 9, 1, 0.88),
(8, 85.6, 18, 1, 0.86);
