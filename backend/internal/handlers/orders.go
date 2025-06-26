package handlers

import (
    "encoding/json"
    "errors"
    "net/http"
    "database/sql"

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
    orderID := r.URL.Query().Get("orderId")
    if orderID == "" {
        tools.HandleBadRequest(w, errors.New("orderId is required"))
        return
    }

    row := tools.DB.QueryRow(`
        SELECT o.orderId, o.customerId, o.userId, o.totalPrice, o.createdAt,
               oi.productId, oi.quantity, oi.salePrice
        FROM orders o
        JOIN order_items oi ON o.orderId = oi.orderId
        WHERE o.orderId = ?`, orderID)

    var order models.Order
    var item models.OrderItem
    if err := row.Scan(&order.OrderID, &order.CustomerID, &order.UserID,
        &order.TotalPrice, &order.CreatedAt, &item.ProductID,
        &item.Quantity, &item.SalePrice); err != nil {
        if err == sql.ErrNoRows {
            tools.HandleBadRequest(w, errors.New("order not found"))
            return
        }
        tools.HandleInternalServerError(w, err)
        return
    }
    order.ProductItems = append(order.ProductItems, item)

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