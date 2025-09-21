// Package handlers sets up HTTP routes and middleware for the API.
package handlers

import (
	"github.com/MananKakkar1/SalesBoard/backend/internal/tools"
	"github.com/go-chi/chi"
	chimiddle "github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
)

func Handler(r *chi.Mux) {
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}, // ← add PATCH
		AllowedHeaders:   []string{"*"}, // ← allow any requested headers (e.g., content-type, authorization)
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(chimiddle.StripSlashes)

	// Auth / SSE
	r.Post("/api/login", loginHandler)
	r.Get("/api/events", tools.SSEHandler)

	// Creates
	r.Post("/api/create-product", createProductHandler)
	r.Post("/api/create-customer", createCustomerHandler)
	r.Post("/api/create-order", createOrderHandler)
	r.Post("/api/warehouses", createWarehouseHandler)

	// Customers
	r.Get("/api/customers/total-customers", getTotalCustomersHandler)
	r.Get("/api/customers/recent", getRecentCustomersHandler)
	r.Get("/api/customers/search", searchCustomersHandler)
	r.Get("/api/customers/search-simple", searchCustomersSimpleHandler)
	r.Get("/api/customers", getCustomersHandler)
	r.Get("/api/customers/{id}", getCustomerByIdHandler)

	// Products
	r.Get("/api/products/low-stock", getLowStockProductsHandler)
	r.Get("/api/products/total-products", getTotalProductsHandler)
	r.Get("/api/products/recent", getRecentProductsHandler)
	r.Get("/api/products/search", searchProductsHandler)
	r.Get("/api/products/search-simple", searchProductsSimpleHandler)
	r.Get("/api/products", getProductsHandler)
	r.Get("/api/products/{id}", getProductByIdHandler)
	r.Get("/api/products/{id}/inventory", getProductInventoryHandler)

	// Orders
	r.Get("/api/orders/total", getTotalRevenueHandler)
	r.Get("/api/orders/total-orders", getTotalOrdersHandler)
	r.Get("/api/orders/recent", getRecentOrdersHandler)
	r.Get("/api/orders/search", searchOrdersHandler)
	r.Get("/api/orders", getOrdersHandler)
	r.Get("/api/orders/{id}", getOrderByIDHandler)

	// Warehouses
	r.Get("/api/warehouses", getWarehousesHandler)
	r.Get("/api/warehouses/recent", getRecentWarehousesHandler)
	r.Get("/api/warehouses/total", getTotalWarehousesHandler)
	r.Get("/api/warehouses/search-simple", searchWarehousesSimpleHandler)
	r.Get("/api/warehouses/{id}", getWarehouseByIdHandler)
	r.Put("/api/warehouses/{id}", updateWarehouseHandler)
	r.Delete("/api/warehouses/{id}", deleteWarehouseHandler)

	// Inventory per warehouse
	r.Get("/api/warehouses/{id}/inventory", getWarehouseInventoryHandler)
	r.Patch("/api/warehouses/{id}/inventory", upsertWarehouseInventoryHandler)

	// Update/Delete
	r.Put("/api/products/{id}/stock", updateProductStockHandler)
	r.Put("/api/products/{id}", updateProductHandler)
	r.Put("/api/customers/{id}", updateCustomerDataHandler)
	r.Delete("/api/products/{id}", deleteProductHandler)
	r.Delete("/api/orders/{id}", deleteOrderHandler)
	r.Delete("/api/customers/{id}", deleteCustomerHandler)
	r.Post("/api/warehouses/transfer", transferInventoryHandler)
}
