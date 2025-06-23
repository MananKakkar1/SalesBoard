// Package handlers sets up HTTP routes and middleware for the API.
package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
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

	// Validate required fields
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
	// Validate required fields
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
// Handler configures the HTTP router with CORS, middleware, and API endpoints.
func Handler(r *chi.Mux) {
	// CORS middleware
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
	r.Post("/api/create-customer", CreateCustomerHandler)
	r.Get("/api/customers", getCustomersHandler)
}

