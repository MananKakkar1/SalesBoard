package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	log "github.com/sirupsen/logrus"

	"github.com/MananKakkar1/SalesBoard/backend/internal/models"
	"github.com/MananKakkar1/SalesBoard/backend/internal/tools"
	"github.com/go-chi/chi"
)

// -------------------- Create --------------------

// createProductHandler creates a new product in the database
func createProductHandler(w http.ResponseWriter, r *http.Request) {
	var product models.Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}

	if product.Name == "" || product.Price == 0 {
		tools.HandleBadRequest(w, errors.New("name and price are required"))
		return
	}

	// stock field kept for legacy compatibility; real stock is derived from warehouse_inventory.
	_, err := tools.DB.Exec(
		"INSERT INTO products (name, price, stock) VALUES (?, ?, COALESCE(?, 0))",
		product.Name, product.Price, product.Stock,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
}

// -------------------- Read (List/Search) --------------------

// getProductsHandler gets a list of products with search/pagination and derived totals
func getProductsHandler(w http.ResponseWriter, r *http.Request) {
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

	// Count products (search applies to product name)
	var totalCount int
	var countQuery string
	var countArgs []interface{}
	if search != "" {
		likeQuery := "%" + strings.ToLower(search) + "%"
		countQuery = "SELECT COUNT(*) FROM products WHERE LOWER(name) LIKE ?"
		countArgs = []interface{}{likeQuery}
	} else {
		countQuery = "SELECT COUNT(*) FROM products"
		countArgs = []interface{}{}
	}
	if err := tools.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	totalPages := (totalCount + pageSize - 1) / pageSize
	hasNext := page < totalPages
	hasPrev := page > 1

	// Data query: include legacy p.stock AND derived totals from warehouse_inventory
	var rows *sql.Rows
	var dataQuery string
	var args []interface{}
	if search != "" {
		likeQuery := "%" + strings.ToLower(search) + "%"
		dataQuery = `
		WITH inv AS (
			SELECT product_id,
			       SUM(qty) AS total_stock,
			       SUM(CASE WHEN qty > 0 THEN 1 ELSE 0 END) AS warehouses_count
			FROM warehouse_inventory
			GROUP BY product_id
		)
		SELECT p.id, p.name, p.price, p.stock,
		       COALESCE(inv.total_stock, 0) AS total_stock,
		       COALESCE(inv.warehouses_count, 0) AS warehouses_count
		FROM products p
		LEFT JOIN inv ON inv.product_id = p.id
		WHERE LOWER(p.name) LIKE ?
		ORDER BY p.id
		LIMIT ? OFFSET ?`
		args = []interface{}{likeQuery, pageSize, offset}
	} else {
		dataQuery = `
		WITH inv AS (
			SELECT product_id,
			       SUM(qty) AS total_stock,
			       SUM(CASE WHEN qty > 0 THEN 1 ELSE 0 END) AS warehouses_count
			FROM warehouse_inventory
			GROUP BY product_id
		)
		SELECT p.id, p.name, p.price, p.stock,
		       COALESCE(inv.total_stock, 0) AS total_stock,
		       COALESCE(inv.warehouses_count, 0) AS warehouses_count
		FROM products p
		LEFT JOIN inv ON inv.product_id = p.id
		ORDER BY p.id
		LIMIT ? OFFSET ?`
		args = []interface{}{pageSize, offset}
	}
	rows, err := tools.DB.Query(dataQuery, args...)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	type ProductRow struct {
		ID              int     `json:"id"`
		Name            string  `json:"name"`
		Price           float64 `json:"price"`
		Stock           int     `json:"stock"`           // legacy stock column
		TotalStock      int     `json:"totalStock"`      // derived from warehouse_inventory
		WarehousesCount int     `json:"warehousesCount"` // number of warehouses with qty > 0
	}
	var items []ProductRow
	for rows.Next() {
		var pr ProductRow
		if err := rows.Scan(&pr.ID, &pr.Name, &pr.Price, &pr.Stock, &pr.TotalStock, &pr.WarehousesCount); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		items = append(items, pr)
	}

	resp := map[string]interface{}{
		"data": items,
		"pagination": map[string]interface{}{
			"page":       page,
			"pageSize":   pageSize,
			"totalCount": totalCount,
			"totalPages": totalPages,
			"hasNext":    hasNext,
			"hasPrev":    hasPrev,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// searchProductsHandler searches for products with pagination (same shape as list)
func searchProductsHandler(w http.ResponseWriter, r *http.Request) {
	// Delegate to getProductsHandler; both accept ?search=, page, pageSize
	getProductsHandler(w, r)
}

// -------------------- Read (Single + Inventory) --------------------

// getProductByIdHandler gets a single product and includes derived totals
func getProductByIdHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	type ProductOut struct {
		ID              int     `json:"id"`
		Name            string  `json:"name"`
		Price           float64 `json:"price"`
		// legacy column; not authoritative anymore
		Stock           int     `json:"stock"`
		TotalStock      int     `json:"totalStock"`
		WarehousesCount int     `json:"warehousesCount"`
	}

	row := tools.DB.QueryRow(`
		WITH inv AS (
			SELECT product_id,
			       SUM(qty) AS total_stock,
			       SUM(CASE WHEN qty > 0 THEN 1 ELSE 0 END) AS warehouses_count
			FROM warehouse_inventory
			WHERE product_id = ?
			GROUP BY product_id
		)
		SELECT p.id, p.name, p.price, p.stock,
		       COALESCE(inv.total_stock, 0) AS total_stock,
		       COALESCE(inv.warehouses_count, 0) AS warehouses_count
		FROM products p
		LEFT JOIN inv ON inv.product_id = p.id
		WHERE p.id = ?`, id, id)

	var out ProductOut
	if err := row.Scan(&out.ID, &out.Name, &out.Price, &out.Stock, &out.TotalStock, &out.WarehousesCount); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Product not found", http.StatusNotFound)
			return
		}
		tools.HandleInternalServerError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// getProductInventoryHandler returns a per-warehouse breakdown for a product
// Response: [{ "warehouse_id": 1, "warehouse_name": "A", "qty": 10 }, ...]
func getProductInventoryHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		tools.HandleBadRequest(w, errors.New("missing product id"))
		return
	}

	rows, err := tools.DB.Query(`
		SELECT w.id AS warehouse_id, w.name AS warehouse_name, COALESCE(i.qty, 0) AS qty
		FROM warehouses w
		LEFT JOIN warehouse_inventory i
		  ON i.warehouse_id = w.id AND i.product_id = ?
		ORDER BY w.id ASC
	`, id)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	type rowT struct {
		WarehouseID   int    `json:"warehouse_id"`
		WarehouseName string `json:"warehouse_name"`
		Qty           int    `json:"qty"`
	}
	var out []rowT
	for rows.Next() {
		var r rowT
		if err := rows.Scan(&r.WarehouseID, &r.WarehouseName, &r.Qty); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		out = append(out, r)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// -------------------- Update/Delete --------------------

// updateProductHandler updates an existing product's information
func updateProductHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if p.Name == "" || p.Price <= 0 {
		tools.HandleBadRequest(w, errors.New("name and price are required"))
		return
	}
	_, err := tools.DB.Exec(
		"UPDATE products SET name=?, price=? WHERE id=?",
		p.Name, p.Price, id,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// deleteProductHandler deletes a product from the database
func deleteProductHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := tools.DB.Exec("DELETE FROM products WHERE id = ?", id)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
}

// -------------------- Search (simple for dropdowns) --------------------

func searchProductsSimpleHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))

	var (
		rows *sql.Rows
		err  error
	)

	if query != "" {
		like := "%" + strings.ToLower(query) + "%"
		rows, err = tools.DB.Query(
			`SELECT id, name, price, stock
			   FROM products
			  WHERE LOWER(name) LIKE ?
			  ORDER BY id`, like,
		)
	} else {
		rows, err = tools.DB.Query(
			`SELECT id, name, price, stock
			   FROM products
			  ORDER BY id`,
		)
	}

	if err != nil {
		// Log the SQL error so you can see it in your backend console
		log.Errorf("searchProductsSimple query error: %v", err)
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Stock); err != nil {
			log.Errorf("searchProductsSimple scan error: %v", err)
			tools.HandleInternalServerError(w, err)
			return
		}
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		log.Errorf("searchProductsSimple rows err: %v", err)
		tools.HandleInternalServerError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(products)
}

// -------------------- Stats --------------------

// getTotalProductsHandler returns the total number of products
func getTotalProductsHandler(w http.ResponseWriter, r *http.Request) {
	var count int
	err := tools.DB.QueryRow("SELECT COUNT(*) FROM products").Scan(&count)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"totalProducts": count})
}

// getRecentProductsHandler returns the 3 most recently added products
func getRecentProductsHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := tools.DB.Query(
		"SELECT id, name, price, stock FROM products ORDER BY id DESC LIMIT 3",
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Stock); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		products = append(products, p)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

// -------------------- Legacy stock endpoint (compat) --------------------

type StockUpdate struct {
	Stock int `json:"stock"`
}

// updateProductStockHandler updates only the products.stock column (LEGACY).
// Real availability is derived from warehouse_inventory. Prefer using
// /api/warehouses/{id}/inventory PATCH or /api/warehouses/transfer.
func updateProductStockHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var s StockUpdate

	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if s.Stock < 0 {
		tools.HandleBadRequest(w, errors.New("stock cannot be negative"))
		return
	}

	_, err := tools.DB.Exec(
		"UPDATE products SET stock=? WHERE id=?",
		s.Stock, id,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// -------------------- Low stock (derived) --------------------

// getLowStockProductsHandler returns products with derived total stock <= threshold
func getLowStockProductsHandler(w http.ResponseWriter, r *http.Request) {
	threshold := 5
	if tStr := r.URL.Query().Get("threshold"); tStr != "" {
		if t, err := strconv.Atoi(tStr); err == nil && t >= 0 {
			threshold = t
		}
	}

	// Optional: limit (default 50, max 1000)
	limit := 50
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 1000 {
			limit = l
		}
	}

	rows, err := tools.DB.Query(`
		WITH inv AS (
			SELECT product_id, SUM(qty) AS total_stock
			FROM warehouse_inventory
			GROUP BY product_id
		)
		SELECT p.id, p.name, p.price,
		       COALESCE(inv.total_stock, 0) AS total_stock
		FROM products p
		LEFT JOIN inv ON inv.product_id = p.id
		WHERE COALESCE(inv.total_stock, 0) <= ?
		ORDER BY total_stock ASC, p.id ASC
		LIMIT ?`, threshold, limit)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	// We return same shape as your existing frontend expects (id, name, price, stock)
	type P struct {
		ID    int     `json:"id"`
		Name  string  `json:"name"`
		Price float64 `json:"price"`
		Stock int     `json:"stock"` // map total_stock into this legacy field
	}
	var items []P
	for rows.Next() {
		var one P
		if err := rows.Scan(&one.ID, &one.Name, &one.Price, &one.Stock); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		items = append(items, one)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}
