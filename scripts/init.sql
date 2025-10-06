-- Script d'initialisation de la base de donnees Kbine
-- Ce script sera execute automatiquement au demarrage du container MySQL

-- Creation de la base de donnees si elle n'existe pas
CREATE DATABASE IF NOT EXISTS kbine_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utilisation de la base de donnees
USE kbine_db;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    role ENUM('client', 'staff', 'admin') DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des operateurs telephoniques
CREATE TABLE IF NOT EXISTS operators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    prefixes JSON NOT NULL, -- Prefixes telephoniques (ex: ["07", "17", "27"])
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des forfaits/plans
CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operator_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    type ENUM('credit', 'minutes', 'internet') NOT NULL,
    validity_days INT DEFAULT NULL,
    ussd_code VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(id)
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'assigned', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    assigned_to INT DEFAULT NULL,
    payment_method ENUM('wave', 'orange_money', 'mtn_money', 'moov_money') NOT NULL,
    payment_reference VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500) DEFAULT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des paiements/transactions
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('wave', 'orange_money', 'mtn_money', 'moov_money') NOT NULL,
    payment_reference VARCHAR(100) NOT NULL,
    external_reference VARCHAR(100) DEFAULT NULL, -- Reference du service de paiement
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    callback_data JSON DEFAULT NULL, -- Donnees du callback
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Insertion des operateurs par defaut
INSERT IGNORE INTO operators (name, code, prefixes) VALUES
('Orange CI', 'ORANGE', '["07"]'),
('MTN', 'MTN', '["05"]'),
('Moov', 'MOOV', '["01"]');

-- Creation des utilisateurs admin par defaut
INSERT IGNORE INTO users (phone_number, role) VALUES
('0789062079', 'admin'),
('0566955943', 'admin');

-- Message de succes
SELECT 'Base de donnees Kbine initialisee avec succes!' as message;