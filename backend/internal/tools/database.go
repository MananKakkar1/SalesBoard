// Package tools provides utility functions for database initialization and management.
package tools

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3" 
	log "github.com/sirupsen/logrus"
)

// DB is the global database connection used throughout the application.
var DB *sql.DB

// InitDB initializes the SQLite database at the given filepath and creates required tables.
func InitDB(filepath string) {
    var err error
    DB, err = sql.Open("sqlite3", filepath)
    if err != nil {
        log.Fatalf("Failed to open database: %v", err)
    }

    createUsersTable := `
    CREATE TABLE IF NOT EXISTS users (
        userId INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        accessKey TEXT NOT NULL,
        userActive INTEGER NOT NULL
    );`
    _, err = DB.Exec(createUsersTable)
    if err != nil {
        log.Fatalf("Failed to create users table: %v", err)
    }

    createCustomersTable := `
    CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT
    );`

    _, err = DB.Exec(createCustomersTable)
    if err != nil {
        log.Fatalf("Failed to create customers table: %v", err)
    }

    createProductsTable := `
    CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL
    );`

    _, err = DB.Exec(createProductsTable)
    if err != nil {
        log.Fatalf("Failed to create products table: %v", err)
    }
    
    createOrdersTable := `
    CREATE TABLE IF NOT EXISTS orders (
    orderId INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    totalPrice REAL NOT NULL,
    createdAt TEXT NOT NULL
    );`

    _, err = DB.Exec(createOrdersTable)
    if err != nil {
        log.Fatalf("Failed to create orders table: %v", err)
    }

    createOrderItemsTable := `
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        salePrice REAL NOT NULL,
        FOREIGN KEY(orderId) REFERENCES orders(orderId),
        FOREIGN KEY(productId) REFERENCES products(id)
    );`

    _, err = DB.Exec(createOrderItemsTable)
    if err != nil {
        log.Fatalf("Failed to create order_items table: %v", err)
    }
}

// InsertDummyUser inserts a default user into the users table if not already present for sample login.
// Username: "dummyuser",
// Password: "dummykey"
func InsertDummyUser() {
    _, err := DB.Exec(`INSERT OR IGNORE INTO users (name, accessKey, userActive) VALUES (?, ?, ?)`,
        "dummyuser", "dummykey", 1)
    if err != nil {
        log.Fatalf("Failed to insert dummy user: %v", err)
    }
}
