// models.go defines the data structures for database entities.

package models

//Customer, Product, Order, OrderItem, and User structs for database entities.
type Customer struct {
    ID      int    `json:"id"`
    Name    string `json:"name"`
    Email   string `json:"email"`
    Phone   string `json:"phone"`
    Address string `json:"address"`
}

type Product struct {
    ID          int     `json:"id"`
    Name        string  `json:"name"`
    Price       float64 `json:"price"`
    Stock       int     `json:"stock"`
}

type Order struct {
    OrderID     int         `json:"orderId"`
    CustomerID  int         `json:"customerId"`
    UserID      int         `json:"userId"`
    ProductItems []OrderItem `json:"productItems"`
    TotalPrice  float64     `json:"totalPrice"`
    CreatedAt   string      `json:"createdAt"`
}

type OrderItem struct {
    ProductID  int     `json:"productId"`
    Quantity   int     `json:"quantity"`
    SalePrice  float64 `json:"salePrice"`
}

type User struct {
    UserID     int    `json:"userId"`
    Name       string `json:"name"`
    AccessKey  string `json:"accessKey"`
    UserActive int    `json:"userActive"`
}