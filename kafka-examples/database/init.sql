-- Database initialization for Kafka examples

-- Orders table for e-commerce example
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id),
    product_id VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    product_id VARCHAR(255) PRIMARY KEY,
    available_quantity INTEGER NOT NULL,
    reserved_quantity INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment processing table for idempotency
CREATE TABLE IF NOT EXISTS processed_payments (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(100),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User activities for analytics
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255)
);

-- Message processing log for debugging
CREATE TABLE IF NOT EXISTS message_processing_log (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    partition INTEGER,
    offset BIGINT,
    message_key VARCHAR(255),
    processing_status VARCHAR(50) NOT NULL,
    error_message TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0
);

-- Dead letter queue messages
CREATE TABLE IF NOT EXISTS dead_letter_messages (
    id SERIAL PRIMARY KEY,
    original_topic VARCHAR(255) NOT NULL,
    message_key VARCHAR(255),
    message_value TEXT,
    error_message TEXT,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0
);

-- Insert sample data
INSERT INTO inventory (product_id, available_quantity) VALUES
('PROD_001', 100),
('PROD_002', 50),
('PROD_003', 200),
('PROD_004', 75),
('PROD_005', 30);

-- Create indexes for better performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_timestamp ON user_activities(timestamp);
CREATE INDEX idx_message_log_topic_partition ON message_processing_log(topic, partition);
CREATE INDEX idx_message_log_status ON message_processing_log(processing_status);