import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const ProductList = () => {
  const navigate = useNavigate();
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
    console.log("Delete product with ID:", id);
  };

  const handleSearchChange = async (e) => {
    console.log("Search value:", e.target.value);
  };

  useEffect(() => {
    console.log("Fetching products...");
  }, []);

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
            placeholder="Search by name or SKU"
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
              <th style={{ textAlign: "left", padding: "8px" }}>SKU</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Price</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Description</th>
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
                  <td style={{ padding: "8px" }}>{product.sku}</td>
                  <td style={{ padding: "8px" }}>{product.price}</td>
                  <td style={{ padding: "8px" }}>{product.description}</td>
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
