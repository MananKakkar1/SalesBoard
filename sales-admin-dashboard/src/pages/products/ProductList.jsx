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
} from "../../features/products/productSlice";

const ProductList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [paginatedProducts, setPaginatedProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const paginate = (items, perPage) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += perPage) {
      chunks.push(items.slice(i, i + perPage));
    }
    return chunks;
  };

  const updatePagination = (list) => {
    const paginated = paginate(list, limit);
    setPaginatedProducts(paginated);
    setPage(1);
  };

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
      const data = search
        ? await dispatch(searchProducts(search)).unwrap()
        : await dispatch(fetchProducts()).unwrap();
      setProducts(data);
      updatePagination(data);
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
      const data = value
        ? await dispatch(searchProducts(value)).unwrap()
        : await dispatch(fetchProducts()).unwrap();
      setProducts(data);
      updatePagination(data);
    } catch (error) {
      setProducts([]);
    }
    setLoading(false);
  };

  const handlePageChange = (newPage) => setPage(newPage);
  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    const paginated = paginate(products, newLimit);
    setPaginatedProducts(paginated);
    setPage(1);
  };

  useEffect(() => {
    const getProducts = async () => {
      setLoading(true);
      try {
        const data = await dispatch(fetchProducts()).unwrap();
        setProducts(data);
        updatePagination(data);
      } catch (error) {
        setProducts([]);
      }
      setLoading(false);
    };
    getProducts();
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
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 8 }}>
                  No products found.
                </td>
              </tr>
            ) : (
              paginatedProducts[page - 1]?.map((product) => (
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
          <span style={{ margin: "0 8px" }}>
            Page {page} of {paginatedProducts.length || 1}
          </span>
          <Button
            disabled={page >= paginatedProducts.length}
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
