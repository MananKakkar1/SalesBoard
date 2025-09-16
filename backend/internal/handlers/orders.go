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

// createOrderHandler creates a new order with multiple products in the database
func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	var order models.Order
	if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}

	if order.CustomerID == 0 || len(order.ProductItems) == 0 || order.TotalPrice <= 0 || order.OrderID == 0 {
		tools.HandleBadRequest(w, errors.New("customerId, productItems, totalPrice, orderId are required"))
		return
	}

	tx, err := tools.DB.Begin()
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(
		"INSERT INTO orders (orderId, customerId, userId, totalPrice, createdAt) VALUES (?, ?, ?, ?, ?)",
		order.OrderID, order.CustomerID, order.UserID, order.TotalPrice, order.CreatedAt,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	for _, item := range order.ProductItems {
		_, err := tx.Exec(
			"INSERT INTO order_items (orderId, productId, quantity, salePrice) VALUES (?, ?, ?, ?)",
			order.OrderID, item.ProductID, item.Quantity, item.SalePrice,
		)
		if err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// getOrdersHandler gets a list of orders with search and pagination
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
	var countQuery string
	var countArgs []interface{}
	if search != "" {
		likeQuery := "%" + strings.ToLower(search) + "%"
		countQuery = `SELECT COUNT(DISTINCT o.orderId) FROM orders o JOIN customers c ON o.customerId = c.id WHERE CAST(o.orderId AS TEXT) LIKE ? OR LOWER(o.createdAt) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ?`
		countArgs = []interface{}{likeQuery, likeQuery, likeQuery, likeQuery}
	} else {
		countQuery = `SELECT COUNT(*) FROM orders`
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
		dataQuery = `SELECT o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt FROM orders o JOIN customers c ON o.customerId = c.id WHERE CAST(o.orderId AS TEXT) LIKE ? OR LOWER(o.createdAt) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ? GROUP BY o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt ORDER BY o.orderId ASC LIMIT ? OFFSET ?`
		args = []interface{}{likeQuery, likeQuery, likeQuery, likeQuery, pageSize, offset}
	} else {
		dataQuery = `SELECT orderId, customerId, userId, totalPrice, createdAt FROM orders ORDER BY orderId ASC LIMIT ? OFFSET ?`
		args = []interface{}{pageSize, offset}
	}
	rows, err = tools.DB.Query(dataQuery, args...)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()
	var orders []models.Order
	for rows.Next() {
		var order models.Order
		if err := rows.Scan(&order.OrderID, &order.CustomerID, &order.UserID, &order.TotalPrice, &order.CreatedAt); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		orders = append(orders, order)
	}

	response := map[string]interface{}{
		"data": orders,
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

// getOrderByIDHandler gets a single order with all its product items by order ID
func getOrderByIDHandler(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")

	var order models.Order
	err := tools.DB.QueryRow(
		`SELECT orderId, customerId, userId, totalPrice, createdAt FROM orders WHERE orderId = ?`,
		orderID,
	).Scan(&order.OrderID, &order.CustomerID, &order.UserID, &order.TotalPrice, &order.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}
		tools.HandleInternalServerError(w, err)
		return
	}
	rows, err := tools.DB.Query(
		`SELECT productId, quantity, salePrice FROM order_items WHERE orderId = ?`,
		orderID,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var items []models.OrderItem
	for rows.Next() {
		var item models.OrderItem
		if err := rows.Scan(&item.ProductID, &item.Quantity, &item.SalePrice); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		items = append(items, item)
	}
	order.ProductItems = items

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

// deleteOrderHandler deletes an order and all its product items from the database
func deleteOrderHandler(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	if orderID == "" {
		tools.HandleBadRequest(w, errors.New("orderId is required"))
		return
	}

	tx, err := tools.DB.Begin()
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM order_items WHERE orderId = ?", orderID)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	_, err = tx.Exec("DELETE FROM orders WHERE orderId = ?", orderID)
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

// searchOrdersHandler searches for orders with pagination
func searchOrdersHandler(w http.ResponseWriter, r *http.Request) {
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

	if query == "" {
		response := map[string]interface{}{
			"data": []models.Order{},
			"pagination": map[string]interface{}{
				"page":       page,
				"pageSize":   pageSize,
				"totalCount": 0,
				"totalPages": 0,
				"hasNext":    false,
				"hasPrev":    false,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	var totalCount int
	var countQuery string
	var countArgs []interface{}

	isNumeric := true
	for _, c := range query {
		if c < '0' || c > '9' {
			isNumeric = false
			break
		}
	}

	if isNumeric {
		countQuery = `SELECT COUNT(*) FROM orders WHERE orderId = ?`
		countArgs = []interface{}{query}
	} else {
		likeQuery := "%" + strings.ToLower(query) + "%"
		countQuery = `SELECT COUNT(DISTINCT o.orderId) FROM orders o JOIN customers c ON o.customerId = c.id WHERE LOWER(o.createdAt) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ?`
		countArgs = []interface{}{likeQuery, likeQuery, likeQuery}
	}

	err := tools.DB.QueryRow(countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	totalPages := (totalCount + pageSize - 1) / pageSize
	hasNext := page < totalPages
	hasPrev := page > 1

	var dataQuery string
	var args []interface{}
	if isNumeric {
		dataQuery = `SELECT orderId, customerId, userId, totalPrice, createdAt FROM orders WHERE orderId = ? ORDER BY orderId ASC LIMIT ? OFFSET ?`
		args = []interface{}{query, pageSize, offset}
	} else {
		likeQuery := "%" + strings.ToLower(query) + "%"
		dataQuery = `SELECT o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt FROM orders o JOIN customers c ON o.customerId = c.id WHERE LOWER(o.createdAt) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ? GROUP BY o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt ORDER BY o.orderId ASC LIMIT ? OFFSET ?`
		args = []interface{}{likeQuery, likeQuery, likeQuery, pageSize, offset}
	}
	rows, err := tools.DB.Query(dataQuery, args...)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()
	var orders []models.Order
	for rows.Next() {
		var order models.Order
		if err := rows.Scan(&order.OrderID, &order.CustomerID, &order.UserID, &order.TotalPrice, &order.CreatedAt); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		orders = append(orders, order)
	}

	response := map[string]interface{}{
		"data": orders,
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

// getTotalRevenueHandler returns the total revenue from all orders
func getTotalRevenueHandler(w http.ResponseWriter, r *http.Request) {
	var sum sql.NullFloat64
	err := tools.DB.QueryRow(`SELECT SUM(totalPrice) FROM orders`).Scan(&sum)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	totalRevenue := 0.0
	if sum.Valid {
		totalRevenue = sum.Float64
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]float64{"totalRevenue": totalRevenue})
}

// getTotalOrdersHandler returns the total number of orders
func getTotalOrdersHandler(w http.ResponseWriter, r *http.Request) {
	var totalOrders int
	err := tools.DB.QueryRow(
		`SELECT COUNT(*) FROM orders`,
	).Scan(&totalOrders)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"totalOrders": totalOrders})
}

// getRecentOrdersHandler returns the 3 most recently created orders
func getRecentOrdersHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := tools.DB.Query(
		`SELECT orderId, customerId, userId, totalPrice, createdAt
         FROM orders ORDER BY orderId DESC LIMIT 3`,
	)
	if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.OrderID, &o.CustomerID, &o.UserID, &o.TotalPrice, &o.CreatedAt); err != nil {
			tools.HandleInternalServerError(w, err)
			return
		}
		orders = append(orders, o)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}