// handlers/warehouses.go
package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/MananKakkar1/SalesBoard/backend/internal/models"
	"github.com/MananKakkar1/SalesBoard/backend/internal/tools"
	"github.com/go-chi/chi"
)

// --- Request/response bodies ---

type warehouseCU struct {
	Name      string `json:"name"`
	Latitude  string `json:"latitude"`
	Longitude string `json:"longitude"`
	Capacity  int    `json:"capacity"`
}

type invItemPatch struct {
	ProductID int `json:"product_id"`
	Qty       int `json:"qty"`
}
type invBulkPatch struct {
	Items []invItemPatch `json:"items"`
}

// --- Warehouses CRUD ---

// POST /warehouses
func createWarehouseHandler(w http.ResponseWriter, r *http.Request) {
	var body warehouseCU
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if strings.TrimSpace(body.Name) == "" || strings.TrimSpace(body.Latitude) == "" || strings.TrimSpace(body.Longitude) == "" {
		tools.HandleBadRequest(w, errors.New("name, latitude, longitude are required"))
		return
	}
	if body.Capacity < 0 {
		tools.HandleBadRequest(w, errors.New("capacity cannot be negative"))
		return
	}

	res, err := tools.DB.Exec(
		"INSERT INTO warehouses (name, latitude, longitude, productsCount, capacity) VALUES (?, ?, ?, ?, ?)",
		body.Name, body.Latitude, body.Longitude, 0, body.Capacity,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	id, _ := res.LastInsertId()

	out := models.Warehouse{
		ID:            int(id),
		Name:          body.Name,
		Latitude:      body.Latitude,
		Longitude:     body.Longitude,
		ProductsCount: 0,
		Capacity:      body.Capacity,
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// GET /warehouses?search=&page=&pageSize=
func getWarehousesHandler(w http.ResponseWriter, r *http.Request) {
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
	var countQuery string
	var countArgs []interface{}
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		countQuery = "SELECT COUNT(*) FROM warehouses WHERE LOWER(name) LIKE ?"
		countArgs = []interface{}{like}
	} else {
		countQuery = "SELECT COUNT(*) FROM warehouses"
		countArgs = []interface{}{}
	}
	if err := tools.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	totalPages := (totalCount + pageSize - 1) / pageSize
	hasNext := page < totalPages
	hasPrev := page > 1

	var rows *sql.Rows
	var dataQuery string
	var args []interface{}
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		dataQuery = `
			SELECT w.id, w.name, w.latitude, w.longitude, w.capacity,
			       COALESCE((
			         SELECT COUNT(*)
			         FROM warehouse_inventory wi
			         WHERE wi.warehouse_id = w.id AND wi.qty > 0
			       ), 0) AS productsCount
			FROM warehouses w
			WHERE LOWER(w.name) LIKE ?
			ORDER BY w.id
			LIMIT ? OFFSET ?`
		args = []interface{}{like, pageSize, offset}
	} else {
		dataQuery = `
			SELECT w.id, w.name, w.latitude, w.longitude, w.capacity,
			       COALESCE((
			         SELECT COUNT(*)
			         FROM warehouse_inventory wi
			         WHERE wi.warehouse_id = w.id AND wi.qty > 0
			       ), 0) AS productsCount
			FROM warehouses w
			ORDER BY w.id
			LIMIT ? OFFSET ?`
		args = []interface{}{pageSize, offset}
	}

	rows, err := tools.DB.Query(dataQuery, args...)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var list []models.Warehouse
	for rows.Next() {
		var wh models.Warehouse
		if err := rows.Scan(&wh.ID, &wh.Name, &wh.Latitude, &wh.Longitude, &wh.Capacity, &wh.ProductsCount); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		list = append(list, wh)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data": list,
		"pagination": map[string]interface{}{
			"page":       page,
			"pageSize":   pageSize,
			"totalCount": totalCount,
			"totalPages": totalPages,
			"hasNext":    hasNext,
			"hasPrev":    hasPrev,
		},
	})
}

// GET /warehouses/{id}
func getWarehouseByIdHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := tools.DB.QueryRow(`
		SELECT w.id, w.name, w.latitude, w.longitude, w.capacity,
		       COALESCE((
		         SELECT COUNT(*)
		         FROM warehouse_inventory wi
		         WHERE wi.warehouse_id = w.id AND wi.qty > 0
		       ), 0) AS productsCount
		FROM warehouses w
		WHERE w.id = ?`, id)

	var wh models.Warehouse
	if err := row.Scan(&wh.ID, &wh.Name, &wh.Latitude, &wh.Longitude, &wh.Capacity, &wh.ProductsCount); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Warehouse not found", http.StatusNotFound)
			return
		}
		tools.HandleInternalServerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(wh)
}

// PUT /warehouses/{id}
func updateWarehouseHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body warehouseCU
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if strings.TrimSpace(body.Name) == "" || strings.TrimSpace(body.Latitude) == "" || strings.TrimSpace(body.Longitude) == "" {
		tools.HandleBadRequest(w, errors.New("name, latitude, longitude are required"))
		return
	}
	if body.Capacity < 0 {
		tools.HandleBadRequest(w, errors.New("capacity cannot be negative"))
		return
	}

	if _, err := tools.DB.Exec(
		"UPDATE warehouses SET name=?, latitude=?, longitude=?, capacity=? WHERE id=?",
		body.Name, body.Latitude, body.Longitude, body.Capacity, id,
	); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	// return updated row
	getWarehouseByIdHandler(w, r)
}

// DELETE /warehouses/{id}
func deleteWarehouseHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if _, err := tools.DB.Exec("DELETE FROM warehouses WHERE id = ?", id); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /warehouses/recent
func getRecentWarehousesHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := tools.DB.Query(`
		SELECT w.id, w.name, w.latitude, w.longitude, w.capacity,
		       COALESCE((
		         SELECT COUNT(*)
		         FROM warehouse_inventory wi
		         WHERE wi.warehouse_id = w.id AND wi.qty > 0
		       ), 0) AS productsCount
		FROM warehouses w
		ORDER BY w.id DESC
		LIMIT 3`,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var list []models.Warehouse
	for rows.Next() {
		var wh models.Warehouse
		if err := rows.Scan(&wh.ID, &wh.Name, &wh.Latitude, &wh.Longitude, &wh.Capacity, &wh.ProductsCount); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		list = append(list, wh)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

// GET /warehouses/total
func getTotalWarehousesHandler(w http.ResponseWriter, r *http.Request) {
	var count int
	if err := tools.DB.QueryRow("SELECT COUNT(*) FROM warehouses").Scan(&count); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]int{"totalWarehouses": count})
}

// GET /warehouses/search-simple?q=
func searchWarehousesSimpleHandler(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	var rows *sql.Rows
	var err error
	if q != "" {
		like := "%" + strings.ToLower(q) + "%"
		rows, err = tools.DB.Query(`
			SELECT w.id, w.name, w.latitude, w.longitude, w.capacity,
			       COALESCE((
			         SELECT COUNT(*)
			         FROM warehouse_inventory wi
			         WHERE wi.warehouse_id = w.id AND wi.qty > 0
			       ), 0) AS productsCount
			FROM warehouses w
			WHERE LOWER(w.name) LIKE ?
			ORDER BY w.id`, like)
	} else {
		rows, err = tools.DB.Query(`
			SELECT w.id, w.name, w.latitude, w.longitude, w.capacity,
			       COALESCE((
			         SELECT COUNT(*)
			         FROM warehouse_inventory wi
			         WHERE wi.warehouse_id = w.id AND wi.qty > 0
			       ), 0) AS productsCount
			FROM warehouses w
			ORDER BY w.id`)
	}
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var list []models.Warehouse
	for rows.Next() {
		var wh models.Warehouse
		if err := rows.Scan(&wh.ID, &wh.Name, &wh.Latitude, &wh.Longitude, &wh.Capacity, &wh.ProductsCount); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		list = append(list, wh)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

// --- Inventory per warehouse ---

// GET /warehouses/{id}/inventory  ->  [{product_id, name, qty}]
func getWarehouseInventoryHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Ensure warehouse exists
	var exists int
	if err := tools.DB.QueryRow("SELECT COUNT(*) FROM warehouses WHERE id = ?", id).Scan(&exists); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	if exists == 0 {
		http.Error(w, "Warehouse not found", http.StatusNotFound)
		return
	}

	rows, err := tools.DB.Query(`
		SELECT p.id AS product_id, p.name, wi.qty
		FROM warehouse_inventory wi
		JOIN products p ON p.id = wi.product_id
		WHERE wi.warehouse_id = ?
		ORDER BY p.id`, id)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	type invRow struct {
		ProductID int    `json:"product_id"`
		Name      string `json:"name"`
		Qty       int    `json:"qty"`
	}
	var out []invRow
	for rows.Next() {
		var r invRow
		if err := rows.Scan(&r.ProductID, &r.Name, &r.Qty); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		out = append(out, r)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// PATCH /warehouses/{id}/inventory  body: { "items": [ { "product_id": 1, "qty": 120 }, ... ] }
func upsertWarehouseInventoryHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body invBulkPatch
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if len(body.Items) == 0 {
		tools.HandleBadRequest(w, errors.New("no items to update"))
		return
	}

	tx, err := tools.DB.Begin()
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer func() { _ = tx.Rollback() }()

	// Basic existence checks (warehouse)
	var exists int
	if err := tx.QueryRow("SELECT COUNT(*) FROM warehouses WHERE id = ?", id).Scan(&exists); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	if exists == 0 {
		http.Error(w, "Warehouse not found", http.StatusNotFound)
		return
	}

	stmt, err := tx.Prepare(`
		INSERT INTO warehouse_inventory (warehouse_id, product_id, qty)
		VALUES (?, ?, ?)
		ON CONFLICT(warehouse_id, product_id)
		DO UPDATE SET qty = excluded.qty
	`)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer stmt.Close()

	for _, it := range body.Items {
		if it.ProductID <= 0 || it.Qty < 0 {
			tools.HandleBadRequest(w, errors.New("invalid product_id or qty"))
			return
		}
		// Ensure product exists
		var pexists int
		if err := tx.QueryRow("SELECT COUNT(*) FROM products WHERE id = ?", it.ProductID).Scan(&pexists); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		if pexists == 0 {
			tools.HandleBadRequest(w, errors.New("product does not exist"))
			return
		}

		if _, err := stmt.Exec(id, it.ProductID, it.Qty); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	// Optional: SSE broadcast
	tools.SSE.Broadcast(tools.Event{
		Type: "warehouse.inventory_updated",
		Data: map[string]any{"warehouseId": id, "count": len(body.Items)},
		Time: time.Now(),
	})

	w.WriteHeader(http.StatusNoContent)
}

type transferBody struct {
	ProductID       int `json:"productId"`
	FromWarehouseID int `json:"fromWarehouseId"`
	ToWarehouseID   int `json:"toWarehouseId"`
	Qty             int `json:"qty"`
}

func transferInventoryHandler(w http.ResponseWriter, r *http.Request) {
	var body transferBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if body.ProductID <= 0 || body.FromWarehouseID <= 0 || body.ToWarehouseID <= 0 || body.Qty <= 0 {
		tools.HandleBadRequest(w, errors.New("productId, fromWarehouseId, toWarehouseId and positive qty are required"))
		return
	}
	if body.FromWarehouseID == body.ToWarehouseID {
		tools.HandleBadRequest(w, errors.New("from and to warehouses must be different"))
		return
	}

	tx, err := tools.DB.Begin()
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer tx.Rollback()

	// Ensure source row exists
	var fromQty int
	err = tx.QueryRow(`
		SELECT COALESCE(qty, 0) FROM warehouse_inventory
		WHERE warehouse_id = ? AND product_id = ?`,
		body.FromWarehouseID, body.ProductID,
	).Scan(&fromQty)
	if err == sql.ErrNoRows {
		fromQty = 0
	} else if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	if fromQty < body.Qty {
		tools.HandleBadRequest(w, errors.New("insufficient quantity in source warehouse"))
		return
	}

	// Deduct from source
	_, err = tx.Exec(`
		UPDATE warehouse_inventory
		SET qty = qty - ?
		WHERE warehouse_id = ? AND product_id = ?`,
		body.Qty, body.FromWarehouseID, body.ProductID,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	// Add to destination (upsert)
	_, err = tx.Exec(`
		INSERT INTO warehouse_inventory (warehouse_id, product_id, qty)
		VALUES (?, ?, ?)
		ON CONFLICT(warehouse_id, product_id)
		DO UPDATE SET qty = qty + excluded.qty`,
		body.ToWarehouseID, body.ProductID, body.Qty,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	if err := tx.Commit(); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
