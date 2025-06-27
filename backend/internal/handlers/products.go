package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/MananKakkar1/min-manan/backend/internal/models"
	"github.com/MananKakkar1/min-manan/backend/internal/tools"
	"github.com/go-chi/chi"
)

func createProductHandler(w http.ResponseWriter, r *http.Request) {
	var product models.Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}

	if product.Name == "" || product.Price == 0 || product.Stock == 0 {
		tools.HandleBadRequest(w, errors.New("all fields are required"))
		return
	}

	_, err := tools.DB.Exec(
		"INSERT INTO products (name, price, stock) VALUES (?, ?, ?)",
		product.Name, product.Price, product.Stock,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
}

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
	var rows *sql.Rows
	var err error
	var dataQuery string
	var args []interface{}
	if search != "" {
		likeQuery := "%" + strings.ToLower(search) + "%"
		dataQuery = "SELECT id, name, price, stock FROM products WHERE LOWER(name) LIKE ? ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{likeQuery, pageSize, offset}
	} else {
		dataQuery = "SELECT id, name, price, stock FROM products ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{pageSize, offset}
	}
	rows, err = tools.DB.Query(dataQuery, args...)
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
	totalPages := 0
	hasNext := false
	hasPrev := page > 1
	response := map[string]interface{}{
		"data": products,
		"pagination": map[string]interface{}{
			"page":       page,
			"pageSize":   pageSize,
			"totalPages": totalPages,
			"hasNext":    hasNext,
			"hasPrev":    hasPrev,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getProductByIdHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Product
	err := tools.DB.QueryRow(
		"SELECT id, name, price, stock FROM products WHERE id = ?",
		id,
	).Scan(&p.ID, &p.Name, &p.Price, &p.Stock)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Product not found", http.StatusNotFound)
			return
		}
		tools.HandleInternalServerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func updateProductHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if p.Name == "" || p.Price <= 0 || p.Stock <= 0 {
		tools.HandleBadRequest(w, errors.New("all fields are required"))
		return
	}
	_, err := tools.DB.Exec(
		"UPDATE products SET name=?, price=?, stock=? WHERE id=?",
		p.Name, p.Price, p.Stock, id,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func deleteProductHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := tools.DB.Exec("DELETE FROM products WHERE id = ?", id)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
}

func searchProductsHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
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
	var rows *sql.Rows
	var err error
	var dataQuery string
	var args []interface{}
	if query != "" {
		likeQuery := "%" + strings.ToLower(query) + "%"
		dataQuery = "SELECT id, name, price, stock FROM products WHERE LOWER(name) LIKE ? ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{likeQuery, pageSize, offset}
	} else {
		dataQuery = "SELECT id, name, price, stock FROM products ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{pageSize, offset}
	}
	rows, err = tools.DB.Query(dataQuery, args...)
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
	totalPages := 0
	hasNext := false
	hasPrev := page > 1
	response := map[string]interface{}{
		"data": products,
		"pagination": map[string]interface{}{
			"page":       page,
			"pageSize":   pageSize,
			"totalPages": totalPages,
			"hasNext":    hasNext,
			"hasPrev":    hasPrev,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

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

type StockUpdate struct {
	Stock int `json:"stock"`
}

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
