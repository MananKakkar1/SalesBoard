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

	// Always enforce foreign keys in SQLite
	if _, err := DB.Exec(`PRAGMA foreign_keys = ON;`); err != nil {
		log.Fatalf("Failed to enable foreign keys: %v", err)
	}

	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		userId INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		accessKey TEXT NOT NULL,
		userActive INTEGER NOT NULL
	);`
	if _, err = DB.Exec(createUsersTable); err != nil {
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
	if _, err = DB.Exec(createCustomersTable); err != nil {
		log.Fatalf("Failed to create customers table: %v", err)
	}

	createProductsTable := `
	CREATE TABLE IF NOT EXISTS products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		price REAL NOT NULL,
		stock INTEGER NOT NULL
	);`
	if _, err = DB.Exec(createProductsTable); err != nil {
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
	if _, err = DB.Exec(createOrdersTable); err != nil {
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
	if _, err = DB.Exec(createOrderItemsTable); err != nil {
		log.Fatalf("Failed to create order_items table: %v", err)
	}

	createWarehousesTable := `
	CREATE TABLE IF NOT EXISTS warehouses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		latitude TEXT NOT NULL,
		longitude TEXT NOT NULL,
		productsCount INTEGER NOT NULL,
		capacity INTEGER NOT NULL
	);`
	if _, err = DB.Exec(createWarehousesTable); err != nil {
		log.Fatalf("Failed to create warehouses table: %v", err)
	}

	// Inventory table (works with ON CONFLICT(warehouse_id, product_id))
	createWarehouseInventoryTable := `
	CREATE TABLE IF NOT EXISTS warehouse_inventory (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		warehouse_id INTEGER NOT NULL,
		product_id   INTEGER NOT NULL,
		qty          INTEGER NOT NULL CHECK (qty >= 0),
		FOREIGN KEY(warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
		FOREIGN KEY(product_id)   REFERENCES products(id)   ON DELETE RESTRICT
	);`
	if _, err = DB.Exec(createWarehouseInventoryTable); err != nil {
		log.Fatalf("Failed to create warehouse_inventory table: %v", err)
	}

	// Uniqueness for (warehouse_id, product_id) so upserts work
	if _, err = DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wi_wh_prod ON warehouse_inventory(warehouse_id, product_id);`); err != nil {
		log.Fatalf("Failed to create warehouse_inventory unique index: %v", err)
	}

	// Helpful lookup indexes
	if _, err = DB.Exec(`CREATE INDEX IF NOT EXISTS idx_wi_product ON warehouse_inventory(product_id);`); err != nil {
		log.Fatalf("Failed to create idx_wi_product: %v", err)
	}
	if _, err = DB.Exec(`CREATE INDEX IF NOT EXISTS idx_wi_warehouse ON warehouse_inventory(warehouse_id);`); err != nil {
		log.Fatalf("Failed to create idx_wi_warehouse: %v", err)
	}

	// --------- Views for convenient aggregation (read-only) ---------

	// Total stock & #warehouses per product (derived from inventory)
	productAggView := `
	CREATE VIEW IF NOT EXISTS product_inventory_agg AS
	SELECT
		p.id          AS product_id,
		COALESCE(SUM(wi.qty), 0) AS total_stock,
		COALESCE(SUM(CASE WHEN wi.qty > 0 THEN 1 ELSE 0 END), 0) AS warehouses_count
	FROM products p
	LEFT JOIN warehouse_inventory wi ON wi.product_id = p.id
	GROUP BY p.id;`
	if _, err = DB.Exec(productAggView); err != nil {
		log.Fatalf("Failed to create product_inventory_agg view: %v", err)
	}

	// Distinct products and total qty per warehouse
	warehouseAggView := `
	CREATE VIEW IF NOT EXISTS warehouse_inventory_agg AS
	SELECT
		w.id AS warehouse_id,
		COALESCE(COUNT(DISTINCT CASE WHEN wi.qty > 0 THEN wi.product_id END), 0) AS distinct_products,
		COALESCE(SUM(wi.qty), 0) AS total_qty
	FROM warehouses w
	LEFT JOIN warehouse_inventory wi ON wi.warehouse_id = w.id
	GROUP BY w.id;`
	if _, err = DB.Exec(warehouseAggView); err != nil {
		log.Fatalf("Failed to create warehouse_inventory_agg view: %v", err)
	}

	// --------- Triggers to maintain warehouses.productsCount ---------
	// We keep productsCount = # of DISTINCT products with qty > 0 in that warehouse.

	afterInsert := `
	CREATE TRIGGER IF NOT EXISTS trg_wi_after_insert
	AFTER INSERT ON warehouse_inventory
	BEGIN
	  UPDATE warehouses
	     SET productsCount = (
	       SELECT COUNT(DISTINCT product_id)
	         FROM warehouse_inventory
	        WHERE warehouse_id = NEW.warehouse_id AND qty > 0
	     )
	   WHERE id = NEW.warehouse_id;
	END;`
	if _, err = DB.Exec(afterInsert); err != nil {
		log.Fatalf("Failed to create trg_wi_after_insert: %v", err)
	}

	afterUpdate := `
	CREATE TRIGGER IF NOT EXISTS trg_wi_after_update
	AFTER UPDATE OF qty ON warehouse_inventory
	BEGIN
	  UPDATE warehouses
	     SET productsCount = (
	       SELECT COUNT(DISTINCT product_id)
	         FROM warehouse_inventory
	        WHERE warehouse_id = NEW.warehouse_id AND qty > 0
	     )
	   WHERE id = NEW.warehouse_id;
	END;`
	if _, err = DB.Exec(afterUpdate); err != nil {
		log.Fatalf("Failed to create trg_wi_after_update: %v", err)
	}

	afterDelete := `
	CREATE TRIGGER IF NOT EXISTS trg_wi_after_delete
	AFTER DELETE ON warehouse_inventory
	BEGIN
	  UPDATE warehouses
	     SET productsCount = (
	       SELECT COUNT(DISTINCT product_id)
	         FROM warehouse_inventory
	        WHERE warehouse_id = OLD.warehouse_id AND qty > 0
	     )
	   WHERE id = OLD.warehouse_id;
	END;`
	if _, err = DB.Exec(afterDelete); err != nil {
		log.Fatalf("Failed to create trg_wi_after_delete: %v", err)
	}

	modify := `ALTER TABLE warehouses ADD COLUMN lat REAL;
	ALTER TABLE warehouses ADD COLUMN lng REAL;

	ALTER TABLE customers ADD COLUMN lat REAL;
	ALTER TABLE customers ADD COLUMN lng REAL;

	ALTER TABLE products ADD COLUMN weight REAL DEFAULT 1.0;
	ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0;`

	if _, err = DB.Exec(modify); err != nil {
		log.Printf("Failed to modify tables (might be already modified): %v", err)
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
