package handlers

import (
    "encoding/json"
    "errors"
    "net/http"
    "database/sql"
    "strings"

    "github.com/go-chi/chi"
    "github.com/MananKakkar1/min-manan/backend/internal/tools"
    "github.com/MananKakkar1/min-manan/backend/internal/models"
)

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

func getOrdersHandler(w http.ResponseWriter, r *http.Request) {
    rows, err := tools.DB.Query(`
        SELECT o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt,
               oi.productId, oi.quantity, oi.salePrice
        FROM orders o
        JOIN order_items oi ON o.orderId = oi.orderId`)
    if err != nil {
        tools.HandleInternalServerError(w, err)
        return
    }

    defer rows.Close()

    var orders []models.Order
    for rows.Next() {
        var order models.Order
        var item models.OrderItem
        if err := rows.Scan(&order.OrderID, &order.CustomerID, &order.UserID,
            &order.TotalPrice, &order.CreatedAt, &item.ProductID,
            &item.Quantity, &item.SalePrice); err != nil {
            tools.HandleInternalServerError(w, err)
            return
        }
        order.ProductItems = append(order.ProductItems, item)
        orders = append(orders, order)
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(orders)
}

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

func searchOrdersHandler(w http.ResponseWriter, r *http.Request) {
    query := strings.TrimSpace(r.URL.Query().Get("q"))
    var rows *sql.Rows
    var err error
    if query != "" {
        likeQuery := "%" + strings.ToLower(query) + "%"
        rows, err = tools.DB.Query(
            `SELECT o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt
             FROM orders o
             JOIN customers c ON o.customerId = c.id
             WHERE CAST(o.orderId AS TEXT) LIKE ?
                OR LOWER(o.createdAt) LIKE ?
                OR LOWER(c.name) LIKE ?
                OR LOWER(c.email) LIKE ?`,
            likeQuery, likeQuery, likeQuery, likeQuery,
        )
    } else {
        rows, err = tools.DB.Query(
            `SELECT orderId, customerId, userId, totalPrice, createdAt FROM orders`,
        )
    }
    if err != nil {
        tools.HandleInternalServerError(w, err)
        return
    }
    defer rows.Close()

    var orders []models.Order
    count := 0
    for rows.Next() {
        var o models.Order
        if err := rows.Scan(&o.OrderID, &o.CustomerID, &o.UserID, &o.TotalPrice, &o.CreatedAt); err != nil {
            tools.HandleInternalServerError(w, err)
            return
        }
        orders = append(orders, o)
        count++
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(orders)
}

func getTotalRevenueHandler(w http.ResponseWriter, r *http.Request) {
    var totalRevenue float64
    err := tools.DB.QueryRow(
        `SELECT SUM(totalPrice) FROM orders`,
    ).Scan(&totalRevenue)
    if err != nil {
        tools.HandleInternalServerError(w, err)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]float64{"totalRevenue": totalRevenue})
}

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

func getRecentOrdersHandler(w http.ResponseWriter, r *http.Request) {
    rows, err := tools.DB.Query(
        `SELECT orderId, customerId, userId, totalPrice, createdAt
         FROM orders ORDER BY createdAt DESC LIMIT 3`,
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