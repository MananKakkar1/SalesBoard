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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
      if (search) {
        const data = await dispatch(searchProducts(search)).unwrap();
        setProducts(data);
      } else {
        const data = await dispatch(fetchProducts()).unwrap();
        setProducts(data);
      }
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

  useEffect(() => {
    const getProducts = async () => {
      setLoading(true);
      try {
        const data = await dispatch(fetchProducts()).unwrap();
        setProducts(data);
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
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
                  Loading...
                </td>
              </tr>
            ) : !products || products.length === 0 ? null : (
              products.map((product) => (
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
        {/* Pagination controls here */}
      </CardContent>
    </Card>
  );
};

export default ProductList;
