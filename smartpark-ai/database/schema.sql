-- SmartPark AI Database Schema
-- MySQL Database for Traffic & Parking Management System

CREATE DATABASE IF NOT EXISTS smartpark_db;
USE smartpark_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Parking Slots Table
CREATE TABLE IF NOT EXISTS parking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    total_capacity INT NOT NULL DEFAULT 50,
    occupied_slots INT NOT NULL DEFAULT 0,
    is_occupied BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(10, 2) DEFAULT 50.00,
    area VARCHAR(100),
    status ENUM('available', 'full', 'maintenance') DEFAULT 'available',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_location (latitude, longitude),
    INDEX idx_status (status),
    INDEX idx_area (area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reports Table (Crowdsourced Data)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slot_id INT NOT NULL,
    report_type ENUM('available', 'occupied', 'full') NOT NULL,
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by INT,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_slot (slot_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    -- Traffic Data Table
    CREATE TABLE IF NOT EXISTS traffic_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area_name VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        congestion_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
        avg_speed DECIMAL(5, 2),
        vehicle_count INT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_area (area_name),
        INDEX idx_congestion (congestion_level),
        INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Predictions Table (ML Model Outputs)
CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_id INT NOT NULL,
    predicted_occupancy DECIMAL(5, 2) NOT NULL,
    prediction_hour INT NOT NULL,
    day_of_week INT NOT NULL,
    confidence_score DECIMAL(5, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE,
    INDEX idx_slot (slot_id),
    INDEX idx_prediction_time (prediction_hour, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_action (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Rewards/Points System
CREATE TABLE IF NOT EXISTS user_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    total_reports INT DEFAULT 0,
    verified_reports INT DEFAULT 0,
    points INT DEFAULT 0,
    level VARCHAR(50) DEFAULT 'Bronze',
    last_report_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_points (points DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Geo-Tagged Traffic Zones for Prediction
CREATE TABLE IF NOT EXISTS traffic_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(255) NOT NULL,
    zone_code VARCHAR(50) UNIQUE NOT NULL,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INT DEFAULT 500,
    area VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_zone_code (zone_code),
    INDEX idx_location (center_latitude, center_longitude),
    INDEX idx_area (area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Traffic Predictions with Geo-Tagging
CREATE TABLE IF NOT EXISTS traffic_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    predicted_congestion ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    predicted_speed DECIMAL(5, 2),
    predicted_vehicle_count INT,
    prediction_hour INT NOT NULL,
    day_of_week INT NOT NULL,
    confidence_score DECIMAL(5, 4),
    prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES traffic_zones(id) ON DELETE CASCADE,
    INDEX idx_zone (zone_id),
    INDEX idx_location (latitude, longitude),
    INDEX idx_prediction_time (prediction_hour, day_of_week),
    INDEX idx_congestion (predicted_congestion),
    INDEX idx_timestamp (prediction_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Geo-Tagged Traffic Routes
CREATE TABLE IF NOT EXISTS traffic_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    start_latitude DECIMAL(10, 8) NOT NULL,
    start_longitude DECIMAL(11, 8) NOT NULL,
    end_latitude DECIMAL(10, 8) NOT NULL,
    end_longitude DECIMAL(11, 8) NOT NULL,
    route_points JSON,
    avg_congestion_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    total_distance_km DECIMAL(8, 2),
    avg_travel_time_minutes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_start_location (start_latitude, start_longitude),
    INDEX idx_end_location (end_latitude, end_longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Historical Geo-Tagged Traffic Data for ML Training
CREATE TABLE IF NOT EXISTS traffic_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id INT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    congestion_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    avg_speed DECIMAL(5, 2),
    vehicle_count INT,
    hour_of_day INT NOT NULL,
    day_of_week INT NOT NULL,
    is_holiday BOOLEAN DEFAULT FALSE,
    weather_condition VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES traffic_zones(id) ON DELETE SET NULL,
    INDEX idx_zone (zone_id),
    INDEX idx_location (latitude, longitude),
    INDEX idx_time (hour_of_day, day_of_week),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
