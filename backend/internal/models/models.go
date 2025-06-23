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
    OrderID    int `json:"orderId"`
    CustomerID int `json:"customerId"`
    OrderDate  string `json:"orderDate"`
}

type OrderItem struct {
    OrderItemID int `json:"orderItemId"`
    OrderID     int `json:"orderId"`
    ProductID   int `json:"productId"`
    Quantity    int `json:"quantity"`
}

type User struct {
    UserID     int    `json:"userId"`
    Name       string `json:"name"`
    AccessKey  string `json:"accessKey"`
    UserActive int    `json:"userActive"`
}