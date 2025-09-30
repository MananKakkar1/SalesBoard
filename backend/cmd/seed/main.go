package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/MananKakkar1/SalesBoard/backend/internal/tools"
)

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func randInRange(min, max int) int {
	return rand.Intn(max-min+1) + min
}

func randomDateWithin(days int) time.Time {
	now := time.Now()
	ago := now.Add(-time.Duration(days) * 24 * time.Hour)
	// random time between ago..now
	sec := rand.Int63n(now.Unix()-ago.Unix()) + ago.Unix()
	return time.Unix(sec, 0)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// -------- flags --------
	dbPath := flag.String("db", "./salesboard.db", "SQLite file path")
	nCustomers := flag.Int("customers", 2000, "number of customers")
	nProducts := flag.Int("products", 1000, "number of products")
	nWarehouses := flag.Int("warehouses", 10, "number of warehouses")
	nOrders := flag.Int("orders", 100000, "number of orders")
	maxItemsPerOrder := flag.Int("max_items_per_order", 5, "max items per order")
	recentDays := flag.Int("recent_days", 120, "randomize order createdAt within this many days")
	flag.Parse()

	// -------- init DB (reuses your schema creation) --------
	tools.InitDB(*dbPath)
	defer tools.DB.Close()

	// Make sure we have a user to attribute orders to
	tools.InsertDummyUser()

	// Fetch dummy userId
	var userID int64
	err := tools.DB.QueryRow(`SELECT userId FROM users WHERE name = 'dummyuser' LIMIT 1`).Scan(&userID)
	must(err)

	log.Printf("Seeding into %s …", *dbPath)

	// Speed up bulk inserts
	_, err = tools.DB.Exec(`PRAGMA synchronous = OFF;`)
	must(err)
	_, err = tools.DB.Exec(`PRAGMA journal_mode = WAL;`)
	must(err)

	start := time.Now()

	seedCustomers(tools.DB, *nCustomers)
	seedProducts(tools.DB, *nProducts)
	seedWarehouses(tools.DB, *nWarehouses)
	seedWarehouseInventory(tools.DB, *nWarehouses, *nProducts)

	seedOrders(tools.DB, userID, *nOrders, *maxItemsPerOrder, *recentDays)

	log.Printf("✅ Done in %s", time.Since(start))
}

// ---------------- Customers ----------------

func seedCustomers(db *sql.DB, n int) {
	tx, err := db.Begin()
	must(err)
	stmt, err := tx.Prepare(`INSERT INTO customers (name, email, phone, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?)`)
	must(err)
	defer stmt.Close()

	for i := 0; i < n; i++ {
		name := fmt.Sprintf("Customer %06d", i)
		email := fmt.Sprintf("c%06d@example.com", i)
		phone := fmt.Sprintf("+1-416-%03d-%04d", rand.Intn(999), rand.Intn(9999))
		address := fmt.Sprintf("%d Example St, Toronto, ON", randInRange(10, 9999))
		lat := 43.6 + rand.Float64()*0.2
		lng := -79.7 + rand.Float64()*0.3
		_, err = stmt.Exec(name, email, phone, address, lat, lng)
		must(err)
	}
	must(tx.Commit())
	log.Printf("Inserted %d customers", n)
}

// ---------------- Products ----------------

func seedProducts(db *sql.DB, n int) {
	tx, err := db.Begin()
	must(err)
	stmt, err := tx.Prepare(`INSERT INTO products (name, price, stock, weight) VALUES (?, ?, ?, ?)`)
	must(err)
	defer stmt.Close()

	for i := 0; i < n; i++ {
		name := fmt.Sprintf("Product %05d", i)
		price := float64(randInRange(5, 500)) + rand.Float64() // 5.00 .. 500.99
		stock := randInRange(100, 10000)
		weight := 0.2 + rand.Float64()*5.0
		_, err = stmt.Exec(name, price, stock, weight)
		must(err)
	}
	must(tx.Commit())
	log.Printf("Inserted %d products", n)
}

// ---------------- Warehouses ----------------

func seedWarehouses(db *sql.DB, n int) {
	tx, err := db.Begin()
	must(err)
	stmt, err := tx.Prepare(`INSERT INTO warehouses (name, latitude, longitude, productsCount, capacity, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	must(err)
	defer stmt.Close()

	for i := 0; i < n; i++ {
		name := fmt.Sprintf("Warehouse %02d", i)
		latStr := fmt.Sprintf("%.6f", 43.5+rand.Float64()*0.5)
		lngStr := fmt.Sprintf("%.6f", -79.9+rand.Float64()*0.7)
		// productsCount is maintained by triggers; seed initial guess as 0
		capacity := randInRange(50000, 200000)
		lat := 43.5 + rand.Float64()*0.5
		lng := -79.9 + rand.Float64()*0.7
		_, err = stmt.Exec(name, latStr, lngStr, 0, capacity, lat, lng)
		must(err)
	}
	must(tx.Commit())
	log.Printf("Inserted %d warehouses", n)
}

// ---------------- Warehouse Inventory ----------------

func seedWarehouseInventory(db *sql.DB, warehouses, products int) {
	tx, err := db.Begin()
	must(err)
	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO warehouse_inventory (warehouse_id, product_id, qty) VALUES (?, ?, ?)`)
	must(err)
	defer stmt.Close()

	// For each product, sprinkle it into a few random warehouses
	for p := 1; p <= products; p++ {
		nw := randInRange(1, min(warehouses, 5)) // up to 5 warehouses per product
		seen := map[int]bool{}
		for k := 0; k < nw; k++ {
			w := randInRange(1, warehouses)
			if seen[w] {
				continue
			}
			seen[w] = true
			qty := randInRange(10, 1000)
			_, err = stmt.Exec(w, p, qty)
			must(err)
		}
	}
	must(tx.Commit())
	log.Printf("Seeded warehouse_inventory for %d products across %d warehouses", products, warehouses)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ---------------- Orders + Order Items ----------------

func seedOrders(db *sql.DB, userID int64, nOrders, maxItemsPerOrder, recentDays int) {
	// Prepare statements outside the transaction for performance & clarity
	tx, err := db.Begin()
	must(err)

	orderStmt, err := tx.Prepare(`INSERT INTO orders (customerId, userId, totalPrice, createdAt, shipping_cost) VALUES (?, ?, ?, ?, ?)`)
	must(err)
	defer orderStmt.Close()

	itemStmt, err := tx.Prepare(`INSERT INTO order_items (orderId, productId, quantity, salePrice) VALUES (?, ?, ?, ?)`)
	must(err)
	defer itemStmt.Close()

	// We’ll need product price lookups
	priceStmt, err := tx.Prepare(`SELECT price FROM products WHERE id = ?`)
	must(err)
	defer priceStmt.Close()

	// Random customer range:
	var maxCustomerID int64
	must(tx.QueryRow(`SELECT MAX(id) FROM customers`).Scan(&maxCustomerID))
	if maxCustomerID == 0 {
		log.Fatal("No customers available")
	}
	var maxProductID int64
	must(tx.QueryRow(`SELECT MAX(id) FROM products`).Scan(&maxProductID))
	if maxProductID == 0 {
		log.Fatal("No products available")
	}

	batchStart := time.Now()
	for i := 0; i < nOrders; i++ {
		customerID := randInRange(1, int(maxCustomerID))
		createdAt := randomDateWithin(recentDays).UTC().Format(time.RFC3339)
		shipping := float64(randInRange(500, 2500)) / 100.0 // $5.00 - $25.00

		// Insert order with temporary totalPrice=0.0
		res, err := orderStmt.Exec(customerID, userID, 0.0, createdAt, shipping)
		must(err)
		orderID, err := res.LastInsertId()
		must(err)

		nItems := randInRange(1, maxItemsPerOrder)
		var total float64

		seenProducts := map[int]bool{}
		for j := 0; j < nItems; j++ {
			productID := randInRange(1, int(maxProductID))
			if seenProducts[productID] {
				continue
			}
			seenProducts[productID] = true

			qty := randInRange(1, 5)

			var unitPrice float64
			must(priceStmt.QueryRow(productID).Scan(&unitPrice))
			salePrice := unitPrice * (0.8 + rand.Float64()*0.4) // 0.8x–1.2x price variance

			_, err = itemStmt.Exec(orderID, productID, qty, salePrice)
			must(err)
			total += salePrice * float64(qty)
		}
		// Update order total
		_, err = tx.Exec(`UPDATE orders SET totalPrice = ? WHERE orderId = ?`, total+shipping, orderID)
		must(err)

		// Periodic logging
		if (i+1)%10000 == 0 {
			log.Printf("Inserted %d orders (elapsed %s)", i+1, time.Since(batchStart))
		}
	}

	must(tx.Commit())
	log.Printf("Inserted %d orders (with items)", nOrders)
}
