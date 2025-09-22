package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/MananKakkar1/SalesBoard/backend/internal/models"
	"github.com/MananKakkar1/SalesBoard/backend/internal/tools"
	"github.com/go-chi/chi"
)

// ---------- small runtime migration helpers ----------

func ensureOrderItemsHasWarehouseColumn(db *sql.DB) error {
	// check if column exists
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*)
		  FROM pragma_table_info('order_items')
		 WHERE name = 'warehouse_id';
	`).Scan(&count)
	if err != nil {
		return err
	}
	if count == 0 {
		// add column (SQLite: ALTER TABLE ADD COLUMN is idempotent enough if not present)
		if _, err := db.Exec(`ALTER TABLE order_items ADD COLUMN warehouse_id INTEGER`); err != nil {
			// If another process added it between the check and now, ignore "duplicate column" style errors.
			// SQLite returns "duplicate column name: warehouse_id" — just proceed.
		}
	}
	return nil
}

// ---------- Input DTOs ----------
type orderItemIn struct {
	ProductID   int     `json:"productId"`
	Quantity    int     `json:"quantity"`
	SalePrice   float64 `json:"salePrice"`
	WarehouseID int     `json:"warehouseId"` // required: which warehouse fulfills this line
}

type createOrderIn struct {
	OrderID      int           `json:"orderId"`
	CustomerID   int           `json:"customerId"`
	UserID       int           `json:"userId"`
	TotalPrice   float64       `json:"totalPrice"` // accepted but recomputed server-side
	CreatedAt    string        `json:"createdAt"`  // optional; fallback to now
	ProductItems []orderItemIn `json:"productItems"`
}

// ---------- Create (POST /api/orders) ----------
func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	// make sure column exists before we try to INSERT into it
	if err := ensureOrderItemsHasWarehouseColumn(tools.DB); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	var in createOrderIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if in.OrderID == 0 || in.CustomerID == 0 || in.UserID == 0 || len(in.ProductItems) == 0 {
		tools.HandleBadRequest(w, errors.New("orderId, customerId, userId, productItems are required"))
		return
	}
	for _, it := range in.ProductItems {
		if it.ProductID <= 0 || it.Quantity <= 0 || it.WarehouseID <= 0 {
			tools.HandleBadRequest(w, errors.New("each item requires productId > 0, quantity > 0, warehouseId > 0"))
			return
		}
	}

	createdAt := strings.TrimSpace(in.CreatedAt)
	if createdAt == "" {
		createdAt = time.Now().UTC().Format(time.RFC3339)
	}

	tx, err := tools.DB.Begin()
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer tx.Rollback()

	// Insert order shell
	if _, err := tx.Exec(
		`INSERT INTO orders (orderId, customerId, userId, totalPrice, createdAt)
		 VALUES (?, ?, ?, ?, ?)`,
		in.OrderID, in.CustomerID, in.UserID, 0, createdAt,
	); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	var computedTotal float64

	for _, it := range in.ProductItems {
		// Check availability in selected warehouse
		var avail int
		err := tx.QueryRow(
			`SELECT qty FROM warehouse_inventory WHERE warehouse_id = ? AND product_id = ?`,
			it.WarehouseID, it.ProductID,
		).Scan(&avail)
		if err == sql.ErrNoRows {
			tools.HandleBadRequest(w, fmt.Errorf("no inventory for product %d in warehouse %d", it.ProductID, it.WarehouseID))
			return
		}
		if err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		if avail < it.Quantity {
			tools.HandleBadRequest(w, fmt.Errorf("insufficient stock for product %d in warehouse %d", it.ProductID, it.WarehouseID))
			return
		}

		// Deduct stock
		if _, err := tx.Exec(
			`UPDATE warehouse_inventory
			    SET qty = qty - ?
			  WHERE warehouse_id = ? AND product_id = ?`,
			it.Quantity, it.WarehouseID, it.ProductID,
		); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}

		// Insert order item with warehouse_id
		if _, err := tx.Exec(
			`INSERT INTO order_items (orderId, productId, quantity, salePrice, warehouse_id)
			 VALUES (?, ?, ?, ?, ?)`,
			in.OrderID, it.ProductID, it.Quantity, it.SalePrice, it.WarehouseID,
		); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}

		computedTotal += float64(it.Quantity) * it.SalePrice
	}

	// Update total
	if _, err := tx.Exec(
		`UPDATE orders SET totalPrice = ? WHERE orderId = ?`,
		computedTotal, in.OrderID,
	); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	if err := tx.Commit(); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	// SSE notify
	tools.SSE.Broadcast(tools.Event{
		Type: "order.created",
		Data: map[string]any{
			"orderId":    in.OrderID,
			"customerId": in.CustomerID,
			"userId":     in.UserID,
			"totalPrice": computedTotal,
			"createdAt":  createdAt,
		},
		Time: time.Now(),
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"orderId":    in.OrderID,
		"totalPrice": computedTotal,
	})
}

// ---------- List (GET /api/orders?search=&page=&pageSize=) ----------
func getOrdersHandler(w http.ResponseWriter, r *http.Request) {
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("pageSize")

	page := 1
	pageSize := 20
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}
	offset := (page - 1) * pageSize

	var totalCount int
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		if err := tools.DB.QueryRow(
			`SELECT COUNT(DISTINCT o.orderId)
			   FROM orders o
			   JOIN customers c ON o.customerId = c.id
			  WHERE CAST(o.orderId AS TEXT) LIKE ?
			     OR LOWER(o.createdAt) LIKE ?
			     OR LOWER(c.name) LIKE ?
			     OR LOWER(c.email) LIKE ?`,
			like, like, like, like,
		).Scan(&totalCount); err != nil {
			tools.HandleInternalServerError(w, err); return
		}
	} else {
		if err := tools.DB.QueryRow(`SELECT COUNT(*) FROM orders`).Scan(&totalCount); err != nil {
			tools.HandleInternalServerError(w, err); return
		}
	}

	totalPages := (totalCount + pageSize - 1) / pageSize
	hasNext := page < totalPages
	hasPrev := page > 1

	var rows *sql.Rows
	var err error
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		rows, err = tools.DB.Query(
			`SELECT o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt
			   FROM orders o
			   JOIN customers c ON o.customerId = c.id
			  WHERE CAST(o.orderId AS TEXT) LIKE ?
			     OR LOWER(o.createdAt) LIKE ?
			     OR LOWER(c.name) LIKE ?
			     OR LOWER(c.email) LIKE ?
		   GROUP BY o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt
		   ORDER BY o.orderId ASC
			  LIMIT ? OFFSET ?`,
			like, like, like, like, pageSize, offset,
		)
	} else {
		rows, err = tools.DB.Query(
			`SELECT orderId, customerId, userId, totalPrice, createdAt
			   FROM orders
		   ORDER BY orderId ASC
			  LIMIT ? OFFSET ?`,
			pageSize, offset,
		)
	}
	if err != nil { tools.HandleInternalServerError(w, err); return }
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.OrderID, &o.CustomerID, &o.UserID, &o.TotalPrice, &o.CreatedAt); err != nil {
			tools.HandleInternalServerError(w, err); return
		}
		orders = append(orders, o)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data": orders,
		"pagination": map[string]any{
			"page":       page,
			"pageSize":   pageSize,
			"totalCount": totalCount,
			"totalPages": totalPages,
			"hasNext":    hasNext,
			"hasPrev":    hasPrev,
		},
	})
}

// ---------- Read one (GET /api/orders/{id}) ----------
func getOrderByIDHandler(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")

	// Try to ensure column exists so our preferred query works.
	_ = ensureOrderItemsHasWarehouseColumn(tools.DB)

	var o struct {
		OrderID    int     `json:"orderId"`
		CustomerID int     `json:"customerId"`
		UserID     int     `json:"userId"`
		TotalPrice float64 `json:"totalPrice"`
		CreatedAt  string  `json:"createdAt"`
	}
	if err := tools.DB.QueryRow(
		`SELECT orderId, customerId, userId, totalPrice, createdAt
		   FROM orders WHERE orderId = ?`,
		orderID,
	).Scan(&o.OrderID, &o.CustomerID, &o.UserID, &o.TotalPrice, &o.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Order not found", http.StatusNotFound); return
		}
		tools.HandleInternalServerError(w, err); return
	}

	type itemOut struct {
		ProductID     int     `json:"productId"`
		Quantity      int     `json:"quantity"`
		SalePrice     float64 `json:"salePrice"`
		WarehouseID   int     `json:"warehouseId"`
		WarehouseName string  `json:"warehouseName"`
	}

	items := []itemOut{}

	// Preferred query (uses warehouse_id). If it fails with "no such column", fall back without that column.
	const withWarehouse = `
		SELECT oi.productId,
		       oi.quantity,
		       oi.salePrice,
		       COALESCE(oi.warehouse_id, 0) AS warehouse_id,
		       COALESCE(w.name, '')          AS warehouse_name
		  FROM order_items oi
		  LEFT JOIN warehouses w ON w.id = oi.warehouse_id
		 WHERE oi.orderId = ?
	  ORDER BY oi.rowid ASC
	`

	rows, err := tools.DB.Query(withWarehouse, orderID)
	if err != nil && strings.Contains(strings.ToLower(err.Error()), "no such column") {
		// fallback: older schema without warehouse_id
		rows, err = tools.DB.Query(
			`SELECT oi.productId, oi.quantity, oi.salePrice
			   FROM order_items oi
			  WHERE oi.orderId = ?
		   ORDER BY oi.rowid ASC`,
			orderID,
		)
		if err != nil {
			tools.HandleInternalServerError(w, err); return
		}
		defer rows.Close()

		for rows.Next() {
			var it itemOut
			if err := rows.Scan(&it.ProductID, &it.Quantity, &it.SalePrice); err != nil {
				tools.HandleInternalServerError(w, err); return
			}
			// warehouse fields remain zero/empty on legacy rows
			items = append(items, it)
		}
	} else if err != nil {
		tools.HandleInternalServerError(w, err); return
	} else {
		defer rows.Close()
		for rows.Next() {
			var it itemOut
			if err := rows.Scan(&it.ProductID, &it.Quantity, &it.SalePrice, &it.WarehouseID, &it.WarehouseName); err != nil {
				tools.HandleInternalServerError(w, err); return
			}
			items = append(items, it)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"orderId":      o.OrderID,
		"customerId":   o.CustomerID,
		"userId":       o.UserID,
		"totalPrice":   o.TotalPrice,
		"createdAt":    o.CreatedAt,
		"productItems": items,
	})
}

// ---------- Delete (DELETE /api/orders/{id}) ----------
func deleteOrderHandler(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	if orderID == "" {
		tools.HandleBadRequest(w, errors.New("orderId is required"))
		return
	}

	tx, err := tools.DB.Begin()
	if err != nil { tools.HandleInternalServerError(w, err); return }
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM order_items WHERE orderId = ?`, orderID); err != nil {
		tools.HandleInternalServerError(w, err); return
	}
	if _, err := tx.Exec(`DELETE FROM orders WHERE orderId = ?`, orderID); err != nil {
		tools.HandleInternalServerError(w, err); return
	}
	if err := tx.Commit(); err != nil {
		tools.HandleInternalServerError(w, err); return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ---------- Search (GET /api/orders/search?q=&page=&pageSize=) ----------
func searchOrdersHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	pageStr := r.URL.Query().Get("page")
	pageSizeStr := r.URL.Query().Get("pageSize")

	page := 1
	pageSize := 20
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 { page = p }
	}
	if pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 { pageSize = ps }
	}
	offset := (page - 1) * pageSize

	if query == "" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []models.Order{},
			"pagination": map[string]any{
				"page":       page,
				"pageSize":   pageSize,
				"totalCount": 0,
				"totalPages": 0,
				"hasNext":    false,
				"hasPrev":    false,
			},
		})
		return
	}

	// numeric orderId?
	isNumeric := true
	for _, c := range query {
		if c < '0' || c > '9' { isNumeric = false; break }
	}

	var totalCount int
	if isNumeric {
		if err := tools.DB.QueryRow(`SELECT COUNT(*) FROM orders WHERE orderId = ?`, query).Scan(&totalCount); err != nil {
			tools.HandleInternalServerError(w, err); return
		}
	} else {
		like := "%" + strings.ToLower(query) + "%"
		if err := tools.DB.QueryRow(
			`SELECT COUNT(DISTINCT o.orderId)
			   FROM orders o
			   JOIN customers c ON o.customerId = c.id
			  WHERE LOWER(o.createdAt) LIKE ?
			     OR LOWER(c.name) LIKE ?
			     OR LOWER(c.email) LIKE ?`,
			like, like, like,
		).Scan(&totalCount); err != nil {
			tools.HandleInternalServerError(w, err); return
		}
	}

	totalPages := (totalCount + pageSize - 1) / pageSize
	hasNext := page < totalPages
	hasPrev := page > 1

	var rows *sql.Rows
	var err error
	if isNumeric {
		rows, err = tools.DB.Query(
			`SELECT orderId, customerId, userId, totalPrice, createdAt
			   FROM orders
			  WHERE orderId = ?
		   ORDER BY orderId ASC
		      LIMIT ? OFFSET ?`,
			query, pageSize, offset,
		)
	} else {
		like := "%" + strings.ToLower(query) + "%"
		rows, err = tools.DB.Query(
			`SELECT o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt
			   FROM orders o
			   JOIN customers c ON o.customerId = c.id
			  WHERE LOWER(o.createdAt) LIKE ?
			     OR LOWER(c.name) LIKE ?
			     OR LOWER(c.email) LIKE ?
		   GROUP BY o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt
		   ORDER BY o.orderId ASC
		      LIMIT ? OFFSET ?`,
			like, like, like, pageSize, offset,
		)
	}
	if err != nil { tools.HandleInternalServerError(w, err); return }
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.OrderID, &o.CustomerID, &o.UserID, &o.TotalPrice, &o.CreatedAt); err != nil {
			tools.HandleInternalServerError(w, err); return
		}
		orders = append(orders, o)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data": orders,
		"pagination": map[string]any{
			"page":       page,
			"pageSize":   pageSize,
			"totalCount": totalCount,
			"totalPages": totalPages,
			"hasNext":    hasNext,
			"hasPrev":    hasPrev,
		},
	})
}

// ---------- Stats ----------

// GET /api/orders/total (total revenue)
func getTotalRevenueHandler(w http.ResponseWriter, r *http.Request) {
	var sum sql.NullFloat64
	if err := tools.DB.QueryRow(`SELECT SUM(totalPrice) FROM orders`).Scan(&sum); err != nil {
		tools.HandleInternalServerError(w, err); return
	}
	total := 0.0
	if sum.Valid { total = sum.Float64 }
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]float64{"totalRevenue": total})
}

// GET /api/orders/total-orders (count)
func getTotalOrdersHandler(w http.ResponseWriter, r *http.Request) {
	var n int
	if err := tools.DB.QueryRow(`SELECT COUNT(*) FROM orders`).Scan(&n); err != nil {
		tools.HandleInternalServerError(w, err); return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]int{"totalOrders": n})
}

// GET /api/orders/recent
func getRecentOrdersHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := tools.DB.Query(
		`SELECT orderId, customerId, userId, totalPrice, createdAt
		   FROM orders
	   ORDER BY orderId DESC
	      LIMIT 3`,
	)
	if err != nil { tools.HandleInternalServerError(w, err); return }
	defer rows.Close()

	var list []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.OrderID, &o.CustomerID, &o.UserID, &o.TotalPrice, &o.CreatedAt); err != nil {
			tools.HandleInternalServerError(w, err); return
		}
		list = append(list, o)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}
