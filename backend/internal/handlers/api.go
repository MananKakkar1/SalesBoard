// Package handlers sets up HTTP routes and middleware for the API.
package handlers

import (
	"github.com/MananKakkar1/SalesBoard/backend/internal/tools"
	"github.com/go-chi/chi"
	chimiddle "github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
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
	r.Get("/api/events", tools.SSEHandler)

	// Customer routes 
	r.Get("/api/customers/total-customers", getTotalCustomersHandler)
	r.Get("/api/customers/recent", getRecentCustomersHandler)
	r.Get("/api/customers/search", searchCustomersHandler)
	r.Get("/api/customers/search-simple", searchCustomersSimpleHandler)
	r.Get("/api/customers", getCustomersHandler)
	r.Get("/api/customers/{id}", getCustomerByIdHandler)

	// Product routes
	r.Get("/api/products/total-products", getTotalProductsHandler)
	r.Get("/api/products/recent", getRecentProductsHandler)
	r.Get("/api/products/search", searchProductsHandler)
	r.Get("/api/products/search-simple", searchProductsSimpleHandler)
	r.Get("/api/products", getProductsHandler)
	r.Get("/api/products/{id}", getProductByIdHandler)

	// Order routes
	r.Get("/api/orders/total", getTotalRevenueHandler)
	r.Get("/api/orders/total-orders", getTotalOrdersHandler)
	r.Get("/api/orders/recent", getRecentOrdersHandler)
	r.Get("/api/orders/search", searchOrdersHandler)
	r.Get("/api/orders", getOrdersHandler)
	r.Get("/api/orders/{id}", getOrderByIDHandler)

	// Update and delete routes
	r.Put("/api/products/{id}/stock", updateProductStockHandler)
	r.Put("/api/products/{id}", updateProductHandler)
	r.Put("/api/customers/{id}", updateCustomerDataHandler)
	r.Delete("/api/products/{id}", deleteProductHandler)
	r.Delete("/api/orders/{id}", deleteOrderHandler)
	r.Delete("/api/customers/{id}", deleteCustomerHandler)
}
