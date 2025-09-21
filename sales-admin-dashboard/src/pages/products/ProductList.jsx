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
  fetchProductById as fetchProductByIdThunk,
} from "../../features/products/productSlice";

const ProductList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: products, pagination } = useSelector((state) => state.products);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [stockById, setStockById] = useState({}); // id -> stock
  const productsArray = Array.isArray(products) ? products : [];

  const handleNewProduct = () => navigate("/products/new");
  const handleEditProduct = (id) => navigate(`/products/${id}`);

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

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadProducts(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
    loadProducts(1, newPageSize);
  };

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

  // After list loads/changes, fetch stock per product (once) and cache it.
  useEffect(() => {
    const fillStocks = async () => {
      const missingIds = productsArray
        .map((p) => p.id)
        .filter((id) => stockById[id] === undefined);
      if (missingIds.length === 0) return;

      for (const id of missingIds) {
        try {
          const p = await dispatch(fetchProductByIdThunk(id)).unwrap();
          if (p && typeof p.stock !== "undefined") {
            setStockById((m) => ({ ...m, [id]: Number(p.stock || 0) }));
          }
        } catch {
          // ignore failures for individual rows
        }
      }
    };
    fillStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsArray]);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <td colSpan={5} style={{ textAlign: "center", padding: 8 }}>
                  Loading...
                </td>
              </tr>
            ) : !productsArray || productsArray.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 8 }}>
                  No products found.
                </td>
              </tr>
            ) : (
              productsArray.map((product) => {
                const priceNum = Number(product?.price ?? 0);
                const stockNum =
                  typeof product.stock !== "undefined"
                    ? Number(product.stock)
                    : Number(stockById[product.id] ?? 0);

                return (
                  <tr key={product.id}>
                    <td style={{ padding: "8px" }}>{product.id}</td>
                    <td style={{ padding: "8px" }}>{product.name}</td>
                    <td style={{ padding: "8px" }}>${priceNum.toFixed(2)}</td>
                    <td style={{ padding: "8px" }}>{stockNum}</td>
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
                );
              })
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
