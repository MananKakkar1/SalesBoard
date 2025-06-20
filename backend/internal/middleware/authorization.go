// Package middleware provides HTTP middleware for authentication and authorization.
package middleware

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"
	"errors"

	"github.com/MananKakkar1/min-manan/backend/api"
	"github.com/MananKakkar1/min-manan/backend/internal/tools"
	"github.com/golang-jwt/jwt/v5"
)

// unAuthorizedError is returned when authentication fails.
var unAuthorizedError = errors.New("invalid username or password")

// Authorization is a middleware that checks for a valid JWT in the Authorization header.
// It returns 401 Unauthorized if the token is missing or invalid.
func Authorization(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			tools.HandleUnauthorized(w, unAuthorizedError)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		jwtSecret := []byte(os.Getenv("JWT_SECRET"))
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			tools.HandleUnauthorized(w, unAuthorizedError)
			return
		}

		// If authorized, call the next handler or middleware
		next.ServeHTTP(w, r)
	})
}