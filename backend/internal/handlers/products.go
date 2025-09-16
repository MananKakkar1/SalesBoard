package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/MananKakkar1/SalesBoard/backend/internal/models"
	"github.com/MananKakkar1/SalesBoard/backend/internal/tools"
	"github.com/go-chi/chi"
)

// createProductHandler creates a new product in the database
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

// getProductsHandler gets a list of products with search and pagination
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

	err := tools.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
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

	response := map[string]interface{}{
		"data": products,
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
	json.NewEncoder(w).Encode(response)
}

// getProductByIdHandler gets a single product by its ID
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

// updateProductHandler updates an existing product's information
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

// deleteProductHandler deletes a product from the database
func deleteProductHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := tools.DB.Exec("DELETE FROM products WHERE id = ?", id)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
}

// searchProductsHandler searches for products with pagination
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

	var totalCount int
	var countQuery string
	var countArgs []interface{}

	if query != "" {
		likeQuery := "%" + strings.ToLower(query) + "%"
		countQuery = "SELECT COUNT(*) FROM products WHERE LOWER(name) LIKE ?"
		countArgs = []interface{}{likeQuery}
	} else {
		countQuery = "SELECT COUNT(*) FROM products"
		countArgs = []interface{}{}
	}

	err := tools.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	totalPages := (totalCount + pageSize - 1) / pageSize
	hasNext := page < totalPages
	hasPrev := page > 1

	var rows *sql.Rows
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

	response := map[string]interface{}{
		"data": products,
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
	json.NewEncoder(w).Encode(response)
}

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

type StockUpdate struct {
	Stock int `json:"stock"`
}

// updateProductStockHandler updates only the stock quantity of a product
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

// searchProductsSimpleHandler searches for products without pagination (for dropdowns)
func searchProductsSimpleHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))

	var rows *sql.Rows
	var err error
	var dataQuery string
	var args []interface{}

	if query != "" {
		likeQuery := "%" + strings.ToLower(query) + "%"
		dataQuery = "SELECT id, name, price, stock FROM products WHERE LOWER(name) LIKE ? ORDER BY id"
		args = []interface{}{likeQuery}
	} else {
		dataQuery = "SELECT id, name, price, stock FROM products ORDER BY id"
		args = []interface{}{}
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}
