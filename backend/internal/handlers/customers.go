package handlers

import (
    "database/sql"
    "encoding/json"
    "errors"
    "net/http"
    "strings"

    "github.com/go-chi/chi"
    "github.com/MananKakkar1/min-manan/backend/internal/tools"
    "github.com/MananKakkar1/min-manan/backend/internal/models"
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
    rows, err := tools.DB.Query("SELECT id, name, email, phone, address FROM customers")
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
    var rows *sql.Rows
    var err error
    if query != "" {
        likeQuery := strings.ToLower(query) + "%"
        rows, err = tools.DB.Query(
            "SELECT id, name, email, phone, address FROM customers WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ?",
            likeQuery, likeQuery,
        )
    } else {
        rows, err = tools.DB.Query("SELECT id, name, email, phone, address FROM customers")
    }
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