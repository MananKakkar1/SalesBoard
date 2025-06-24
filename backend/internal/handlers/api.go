// Package handlers sets up HTTP routes and middleware for the API.
package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-chi/cors"
	chimiddle "github.com/go-chi/chi/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/MananKakkar1/min-manan/backend/internal/tools"
	"github.com/MananKakkar1/min-manan/backend/internal/models"
)

// LoginRequest represents the expected JSON payload for login requests.
type LoginRequest struct {
	Username  string `json:"username"`
	AccessKey string `json:"accessKey"`
}

// LoginResponse is the JSON response returned on successful login.
type LoginResponse struct {
	Token   string `json:"token,omitempty"`
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// LoginHandler handles POST /api/login requests.
// It is an endpoint of /api/login requests and extracts the login credentials from the request body, checks them against the database,
// and returns a JWT token if the credentials are valid. If authentication fails, it returns
// a 401 Unauthorized error.
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		tools.HandleBadRequest(w, errors.New("invalid request"))
		return
	}

	if req.Username == "" || req.AccessKey == "" {
		tools.HandleBadRequest(w, errors.New("username and accessKey are required"))
		return
	}

	var userId int
	var userActive int
	err := tools.DB.QueryRow(
		"SELECT userId, userActive FROM users WHERE name = ? AND accessKey = ?",
		req.Username, req.AccessKey,
	).Scan(&userId, &userActive)

	if err == sql.ErrNoRows || userActive != 1 {
		tools.HandleUnauthorized(w, errors.New("invalid credentials or inactive user"))
		return
	} else if err != nil {
		tools.HandleInternalServerError(w, err)
		return
	}

	// Create JWT token
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userId,
		"exp":    time.Now().Add(time.Hour * 24).Unix(),
	})
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		tools.HandleInternalServerError(w, errors.New("could not create token"))
		return
	}

	resp := LoginResponse{
		Token:   tokenString,
		Success: true,
		Message: "Login successful",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func CreateCustomerHandler(w http.ResponseWriter, r *http.Request) {
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
    pageStr := r.URL.Query().Get("page")
    limitStr := r.URL.Query().Get("limit")

    page := 1
    limit := 20
    if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
        page = p
    }
    if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
        limit = l
    }
    offset := (page - 1) * limit

    rows, err := tools.DB.Query("SELECT id, name, email, phone, address FROM customers LIMIT ? OFFSET ?", limit, offset)
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

func CreateProductHandler(w http.ResponseWriter, r *http.Request) {
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
    pageStr := r.URL.Query().Get("page")
    limitStr := r.URL.Query().Get("limit")

    page := 1
    limit := 20
    if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
        page = p
    }
    if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
        limit = l
    }
    offset := (page - 1) * limit

    rows, err := tools.DB.Query("SELECT id, name, price, stock FROM products LIMIT ? OFFSET ?", limit, offset)
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
    var rows *sql.Rows
    var err error
    if query != "" {
        likeQuery := strings.ToLower(query) + "%"
        rows, err = tools.DB.Query(
            "SELECT id, name, price, stock FROM products WHERE LOWER(name) LIKE ?",
            likeQuery,
        )
    } else {
        rows, err = tools.DB.Query("SELECT id, name, price, stock FROM products")
    }
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

// Handler configures the HTTP router with CORS, middleware, and API endpoints.
func Handler(r *chi.Mux) {
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(chimiddle.StripSlashes)
	r.Post("/api/login", LoginHandler)
	r.Post("/api/products", CreateProductHandler)
	r.Post("/api/create-customer", CreateCustomerHandler)
	r.Get("/api/customers", getCustomersHandler)
	r.Get("/api/customers/{id}", getCustomerByIdHandler)
	r.Get("/api/customers/search", searchCustomersHandler)
	r.Get("/api/products", getProductsHandler)
	r.Get("/api/products/{id}", getProductByIdHandler)
	r.Get("/api/products/search", searchProductsHandler)
	r.Put("/api/products/{id}", updateProductHandler)
	r.Put("/api/customers/{id}", updateCustomerDataHandler)
	r.Delete("/api/products/{id}", deleteProductHandler)
	r.Delete("/api/customers/{id}/delete", deleteCustomerHandler)
}

