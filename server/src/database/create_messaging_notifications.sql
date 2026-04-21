-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS messages_table;
DROP TABLE IF EXISTS notifications_table;

-- Create messages_table with standardized m_id
CREATE TABLE messages_table (
    m_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users_table(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users_table(id) ON DELETE CASCADE
);

-- Create notifications_table with standardized n_id
CREATE TABLE notifications_table (
    n_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    message VARCHAR(255) NOT NULL,
    type ENUM('order', 'message', 'system') NOT NULL,
    status ENUM('unread', 'read') DEFAULT 'unread',
    link VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_table(id) ON DELETE CASCADE
);
