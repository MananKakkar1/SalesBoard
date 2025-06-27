// main.go starts the HTTP server, loads environment variables, and initializes the database.
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/MananKakkar1/min-manan/backend/internal/handlers"
	"github.com/MananKakkar1/min-manan/backend/internal/tools"
	"github.com/go-chi/chi"
	"github.com/joho/godotenv"
	logrus "github.com/sirupsen/logrus"
)

// main is the entry point for the backend API server.
// In this file, all the necessary env files are loaded, as well as initializing the SQLite database and inserting a dummy user for testing purposes.
// The main function also sets up the HTTP server and starts it.
func main() {
	// Load environment variables from .env file
	err := godotenv.Load("../../internal/middleware/.env")
	if err != nil {
		logrus.Warn(".env file not found or could not be loaded")
	}

	tools.InitDB("app.db")
	tools.InsertDummyUser()


	r := chi.NewRouter()
	handlers.Handler(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Starting server on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
	logrus.Info("Server started successfully")
}