// Package tools provides utility functions for database initialization and management.
package tools

import (
    "database/sql"
    _ "github.com/mattn/go-sqlite3"
    log "github.com/sirupsen/logrus"
    "fmt"
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
    stock INTEGER NOT NULL,
    description TEXT
    );`

    _, err = DB.Exec(createProductsTable)
    if err != nil {
        log.Fatalf("Failed to create products table: %v", err)
    }
    // Other tables will go below
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

func InsertDummyProducts() {
    for i := 1; i <= 20; i++ {
        _, err := DB.Exec(
            `INSERT OR IGNORE INTO products (name, price, stock, description) VALUES (?, ?, ?, ?)`,
            fmt.Sprintf("Product %d", i),
            float64(10*i),
            100+i,
            fmt.Sprintf("Sample description for product %d", i),
        )
        if err != nil {
            log.Fatalf("Failed to insert dummy product %d: %v", i, err)
        }
    }
}

func InsertDummyCustomers() {
    for i := 1; i <= 20; i++ {
        _, err := DB.Exec(
            `INSERT OR IGNORE INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`,
            fmt.Sprintf("Customer %d", i),
            fmt.Sprintf("customer%d@example.com", i),
            fmt.Sprintf("555-010%02d", i),
            fmt.Sprintf("Address %d, City", i),
        )
        if err != nil {
            log.Fatalf("Failed to insert dummy customer %d: %v", i, err)
        }
    }
}