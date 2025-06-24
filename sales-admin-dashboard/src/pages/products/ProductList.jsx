import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import {
  fetchProducts,
  deleteProduct,
  searchProducts,
} from "../../features/auth/authSlice";

const DEFAULT_LIMIT = 20;

const ProductList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const handleNewProduct = () => {
    navigate("/products/new");
  };

  const handleEditProduct = (id) => {
    navigate(`/products/${id}`);
  };

  const handleDeleteProduct = async (id) => {
    setLoading(true);
    try {
      await dispatch(deleteProduct(id)).unwrap();
      fetchPage();
    } catch (error) {
      console.error("Failed to delete product", error);
    }
    setLoading(false);
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setLoading(true);
    try {
      if (value) {
        const data = await dispatch(searchProducts(value)).unwrap();
        setProducts(data);
      } else {
        const data = await dispatch(fetchProducts()).unwrap();
        setProducts(data);
      }
    } catch (error) {
      setProducts([]);
    }
    setLoading(false);
  };

  // Update fetchPage to prevent empty pages
  const fetchPage = async (
    pageNum = page,
    pageLimit = limit,
    searchValue = search
  ) => {
    setLoading(true);
    try {
      let data;
      if (searchValue) {
        data = await dispatch(
          searchProducts(`${searchValue}&page=${pageNum}&limit=${pageLimit}`)
        ).unwrap();
      } else {
        data = await dispatch(
          fetchProducts({ page: pageNum, limit: pageLimit })
        ).unwrap();
      }
      // If no data and not on first page, go back one page
      if (Array.isArray(data) && data.length === 0 && pageNum > 1) {
        setPage(pageNum - 1);
        setLoading(false);
        return;
      }
      setProducts(data);
    } catch (error) {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPage();
  }, [dispatch, page, limit]);

  const handlePageChange = (newPage) => setPage(newPage);
  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  const safeProducts = products || [];

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
        <div style={{ margin: "16px 0" }}>
          <label>
            Page Size:&nbsp;
            <select value={limit} onChange={handleLimitChange}>
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            style={{ marginLeft: 16 }}
          >
            Previous
          </Button>
          <span style={{ margin: "0 8px" }}>Page {page}</span>
          <Button
            disabled={safeProducts.length < limit}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
        {!loading && safeProducts.length === 0 ? null : (
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
                  <td
                    colSpan={6}
                    style={{ padding: "8px", textAlign: "center" }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : (
                safeProducts.map((product) => (
                  <tr key={product.id}>
                    <td style={{ padding: "8px" }}>{product.id}</td>
                    <td style={{ padding: "8px" }}>{product.name}</td>
                    <td style={{ padding: "8px" }}>{product.price}</td>
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
        )}
      </CardContent>
    </Card>
  );
};

export default ProductList;
