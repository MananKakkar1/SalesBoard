// Package handlers sets up HTTP routes and middleware for the API.
package handlers

import (
    "github.com/go-chi/chi"
    "github.com/go-chi/cors"
    chimiddle "github.com/go-chi/chi/middleware"
)


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
    r.Post("/api/login", loginHandler)
    r.Post("/api/create-product", createProductHandler)
    r.Post("/api/create-customer", createCustomerHandler)
    r.Post("/api/create-order", createOrderHandler)
    r.Get("/api/customers", getCustomersHandler)
    r.Get("/api/customers/{id}", getCustomerByIdHandler)
    r.Get("/api/customers/search", searchCustomersHandler)
    r.Get("/api/products", getProductsHandler)
    r.Get("/api/products/{id}", getProductByIdHandler)
    r.Get("/api/products/search", searchProductsHandler)
    r.Get("/api/orders", getOrdersHandler)
    r.Put("/api/products/{id}", updateProductHandler)
    r.Put("/api/customers/{id}", updateCustomerDataHandler)
    r.Delete("/api/products/{id}", deleteProductHandler)
    r.Delete("/api/customers/{id}/delete", deleteCustomerHandler)
}

