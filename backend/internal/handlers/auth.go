package handlers

import (
    "encoding/json"
    "errors"
    "net/http"
    "os"
    "time"

    "database/sql"

    "github.com/golang-jwt/jwt/v5"
    "github.com/MananKakkar1/min-manan/backend/internal/tools"
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
// and returns a JWT token if the credentials are valid. If authentication fails, it returns a 401 Unauthorized error.
func loginHandler(w http.ResponseWriter, r *http.Request) {
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