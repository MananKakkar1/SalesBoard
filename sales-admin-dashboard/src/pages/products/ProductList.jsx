// This is the ProductList page, which can only be accessed through the dashboard and sidebar. 
// This page displays a table of products in the database and allows CRUD operations to be performed on each product.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProducts,
  deleteProduct,
  searchProducts,
} from "../../features/products/productSlice";

const ProductList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: products, pagination } = useSelector((state) => state.products);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const productsArray = Array.isArray(products) ? products : [];

  // Navigate to ProductForm page to create a new product
  const handleNewProduct = () => {
    navigate("/products/new");
  };

  // Navigate to ProductForm page to edit a product with productId
  const handleEditProduct = (id) => {
    navigate(`/products/${id}`);
  };

  // handleDeleteProduct deletes a product based on its productId in the database and loads all products to show the change
  const handleDeleteProduct = async (id) => {
    setLoading(true);
    try {
      await dispatch(deleteProduct(id)).unwrap();
      await loadProducts();
    } catch (error) {
      console.error("Failed to delete product", error);
    }
    setLoading(false);
  };

  // handleSearchChange either searches for products based on "value" entered by a user or fetches all products if "value" does not exist and there is no query
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    setLoading(true);
    try {
      if (value) {
        await dispatch(
          searchProducts({ query: value, page: 1, pageSize })
        ).unwrap();
      } else {
        await dispatch(fetchProducts({ page: 1, pageSize })).unwrap();
      }
    } catch (error) {
      console.error("Failed to search products", error);
    }
    setLoading(false);
  };

  // handlePageChange changes the page and reloads products based on which page is now selected (Pagination)
  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadProducts(newPage);
  };

  // handlePageSizeChange changes the size of the page based on user input and reloads products based on the size of the page from the database (Pagination)
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
    loadProducts(1, newPageSize);
  };

  // loadProducts loads products onto the page either by searching for specific products in the database based on a query or fetches all products if there is no query
  const loadProducts = async (
    currentPage = page,
    currentPageSize = pageSize
  ) => {
    setLoading(true);
    try {
      if (search) {
        await dispatch(
          searchProducts({
            query: search,
            page: currentPage,
            pageSize: currentPageSize,
          })
        ).unwrap();
      } else {
        await dispatch(
          fetchProducts({
            page: currentPage,
            pageSize: currentPageSize,
          })
        ).unwrap();
      }
    } catch (error) {
      console.error("Failed to load products", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [dispatch]);

  return (
    <Card>
      <CardHeader>
        <h2>Products</h2>
        <Button color="primary" onClick={handleNewProduct}>
          Add New Product
        </Button>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: 16 }}>
          <InputField
            id="search"
            placeholder="Search by name"
            fullWidth
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}>ID</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Price</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Stock</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 8 }}>
                  Loading...
                </td>
              </tr>
            ) : !productsArray || productsArray.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 8 }}>
                  No products found.
                </td>
              </tr>
            ) : (
              productsArray.map((product) => (
                <tr key={product.id}>
                  <td style={{ padding: "8px" }}>{product.id}</td>
                  <td style={{ padding: "8px" }}>{product.name}</td>
                  <td style={{ padding: "8px" }}>${product.price}</td>
                  <td style={{ padding: "8px" }}>{product.stock}</td>
                  <td style={{ padding: "8px" }}>
                    <Button
                      color="primary"
                      size="small"
                      onClick={() => handleEditProduct(product.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      color="secondary"
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          <label>
            Page Size:&nbsp;
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(page - 1)}
            style={{ marginLeft: 16 }}
          >
            Previous
          </Button>
          <span style={{ margin: "0 8px" }}>
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <Button
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductList;
