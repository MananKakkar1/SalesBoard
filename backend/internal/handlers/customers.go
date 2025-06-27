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

func createCustomerHandler(w http.ResponseWriter, r *http.Request) {
	var customer models.Customer
	if err := json.NewDecoder(r.Body).Decode(&customer); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}

	if customer.Name == "" || customer.Email == "" || customer.Phone == "" || customer.Address == "" {
		tools.HandleBadRequest(w, errors.New("name and email are required"))
		return
	}

	_, err := tools.DB.Exec(
		"INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)",
		customer.Name, customer.Email, customer.Phone, customer.Address,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
}

func getCustomersHandler(w http.ResponseWriter, r *http.Request) {
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
		dataQuery = "SELECT id, name, email, phone, address FROM customers WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{likeQuery, likeQuery, pageSize, offset}
	} else {
		dataQuery = "SELECT id, name, email, phone, address FROM customers ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{pageSize, offset}
	}
	rows, err = tools.DB.Query(dataQuery, args...)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()
	var customers []models.Customer
	for rows.Next() {
		var c models.Customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Phone, &c.Address); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		customers = append(customers, c)
	}
	totalPages := 0
	hasNext := false
	hasPrev := page > 1
	response := map[string]interface{}{
		"data": customers,
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

func getCustomerByIdHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c models.Customer
	err := tools.DB.QueryRow(
		"SELECT id, name, email, phone, address FROM customers WHERE id = ?",
		id,
	).Scan(&c.ID, &c.Name, &c.Email, &c.Phone, &c.Address)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Customer not found", http.StatusNotFound)
			return
		}
		tools.HandleInternalServerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func updateCustomerDataHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c models.Customer
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}
	if c.Name == "" || c.Email == "" || c.Phone == "" || c.Address == "" {
		tools.HandleBadRequest(w, errors.New("all fields are required"))
		return
	}
	_, err := tools.DB.Exec(
		"UPDATE customers SET name=?, email=?, phone=?, address=? WHERE id=?",
		c.Name, c.Email, c.Phone, c.Address, id,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func deleteCustomerHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := tools.DB.Exec("DELETE FROM customers WHERE id = ?", id)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
}

func searchCustomersHandler(w http.ResponseWriter, r *http.Request) {
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
		dataQuery = "SELECT id, name, email, phone, address FROM customers WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{likeQuery, likeQuery, pageSize, offset}
	} else {
		dataQuery = "SELECT id, name, email, phone, address FROM customers ORDER BY id LIMIT ? OFFSET ?"
		args = []interface{}{pageSize, offset}
	}
	rows, err = tools.DB.Query(dataQuery, args...)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()
	var customers []models.Customer
	for rows.Next() {
		var c models.Customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Phone, &c.Address); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		customers = append(customers, c)
	}
	totalPages := 0
	hasNext := false
	hasPrev := page > 1
	response := map[string]interface{}{
		"data": customers,
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

func getTotalCustomersHandler(w http.ResponseWriter, r *http.Request) {
	var count int
	err := tools.DB.QueryRow("SELECT COUNT(*) FROM customers").Scan(&count)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"totalCustomers": count})
}

func getRecentCustomersHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := tools.DB.Query(
		"SELECT id, name, email, phone, address FROM customers ORDER BY id DESC LIMIT 3",
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var customers []models.Customer
	for rows.Next() {
		var c models.Customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Phone, &c.Address); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		customers = append(customers, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customers)
}
