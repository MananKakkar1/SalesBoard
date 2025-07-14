# 📊 SalesBoard — Sales Administration Dashboard

A full-stack web application for managing customers, products, and sales orders, complete with authentication, form validation, search, and pagination. Built with **React + Redux Toolkit** on the frontend and a **Go REST API with JWT** on the backend, using **SQLite** for data persistence.

---

## 🚀 Features

### 🧑 Customers Module
- List, search (by name/email), and paginate customers
- Full CRUD functionality
- Frontend + backend validation
- Fields: `id`, `name`, `email`, `phone`, `address`

### 📦 Products Module
- List, search (by name), and paginate products
- Full CRUD functionality
- Frontend + backend validation
- Fields: `id`, `name`, `price`, `stock`

### 🧾 Sales Orders Module
- List all sales orders with search/filter by:
  - Customer name/email
  - Order ID or date
- Create new orders:
  - Select customer via searchable dropdown
  - Add multiple products with quantity & price
  - Auto-calculate total
- Fields: `orderId`, `customerId`, `userId`, `productItems`, `totalPrice`, `createdAt`

### 🔐 Authentication
- Login with a dummy user stored in SQLite
- Issue JWT on login
- Protect all write routes using middleware
- Store and manage token in Redux
- Auto-redirect on auth failure (401)

---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- Redux Toolkit (Slices + Async Thunks)
- React Router v6
- Emotion (CSS-in-JS)
- Axios
- JWT Decode

### Backend
- Go (`net/http` or Gin)
- SQLite (`github.com/mattn/go-sqlite3`)
- JWT (`github.com/golang-jwt/jwt`)
- GORM or sqlx (optional for DB layer)

---

## 📂 Project Structure

```
/backend
  ├── main.go
  ├── models/
  ├── handlers/
  ├── middleware/
  └── utils/
  
/frontend
  ├── src/
      ├── components/
      ├── features/
      ├── pages/
      ├── redux/
      ├── routes/
      └── App.jsx
```

---

## 🧪 Setup & Run

### 🖥️ Backend (Go)
1. Install Go and SQLite
2. Run:
   ```bash
   go run main.go
   ```

### 🌐 Frontend (React)
1. `cd frontend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app:
   ```bash
   npm run dev
   ```

---

## ✅ Validation Highlights

- All required fields are validated both frontend and backend
- Email & phone formatting for customers
- Price & stock must be greater than 0 for products
- JWT-protected API endpoints

---

## 📌 Future Improvements

- Role-based access controls
- Export sales reports (CSV/PDF)
- Responsive UI
- Better user management UI

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
