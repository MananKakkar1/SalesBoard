// Package api defines request and response types for the API.
package api

import (
	"encoding/json"
	"net/http"
)

// The following structs define the request and response types for the API endpoints.
type LoginRequest struct {
    Username  string `json:"username"`
    AccessKey string `json:"accessKey"`
}

type LoginResponse struct {
    Token   string `json:"token"`
    Success bool   `json:"success"`
    Message string `json:"message,omitempty"`
}

type RegisterRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
    Email    string `json:"email"`
}

type RegisterResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message,omitempty"`
}

type Error struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

type ErrorResponse struct {
    Error string `json:"error"`
}

// writeError writes a JSON error response with the given message and HTTP status code.
func writeError(w http.ResponseWriter, message string, code int) {
	response := Error{
		Code:   code,
		Message: message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	json.NewEncoder(w).Encode(response)
}

var (
	RequestErrorHandler = func(w http.ResponseWriter, r *http.Request) {
		writeError(w, "Invalid request", http.StatusBadRequest)
	}
	InternalErrorHandler = func(w http.ResponseWriter, r *http.Request) {
		writeError(w, "An unexpected error occurred", http.StatusInternalServerError)
	}
)