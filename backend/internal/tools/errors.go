// Package tools provides utility functions for error handling in HTTP responses.
package tools

import (
    "encoding/json"
    "net/http"
)

// HandleUnauthorized writes a 401 Unauthorized JSON error response.
// It should be used when authentication fails or a valid token is missing.
func HandleUnauthorized(w http.ResponseWriter, err error) {
    w.WriteHeader(http.StatusUnauthorized)
    json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}

// HandleBadRequest writes a 400 Bad Request JSON error response.
// It should be used when the client sends invalid or malformed data.
func HandleBadRequest(w http.ResponseWriter, err error) {
    w.WriteHeader(http.StatusBadRequest)
    json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}

// HandleInternalServerError writes a 500 Internal Server Error JSON response.
// It should be used for unexpected server-side errors.
func HandleInternalServerError(w http.ResponseWriter, err error) {
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}