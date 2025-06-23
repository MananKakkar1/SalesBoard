import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import {
  createProduct,
  updateProduct,
  fetchProducts,
} from "../../features/auth/authSlice";

const fetchProductById = async (id, dispatch) => {
  // Use fetchProducts or a dedicated fetchProductById thunk if you have one
  // For now, fetch all and find by id (replace with a real API call in production)
  const products = await dispatch(fetchProducts()).unwrap();
  return products.find((p) => String(p.id) === String(id));
};

const initialState = {
  name: "",
  price: "",
  stock: "",
  description: "",
};

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      fetchProductById(id, dispatch).then((data) => {
        if (data) setForm(data);
      });
    }
  }, [id, dispatch]);

  const validate = () => {
    const errs = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.price) errs.price = "Price is required";
    if (!form.stock) errs.stock = "Stock is required";
    return errs;
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      try {
        const payload = {
          ...form,
          price: Number(form.price),
          stock: Number(form.stock),
        };
        if (id) {
          await dispatch(updateProduct({ id, productData: payload })).unwrap();
        } else {
          await dispatch(createProduct(payload)).unwrap();
        }
        navigate("/products");
      } catch (error) {
        alert(error?.message || "Failed to save product.");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2>{id ? "Edit Product" : "Add New Product"}</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <InputField
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
            type="text"
          />
          <InputField
            label="Price"
            name="price"
            value={form.price}
            onChange={handleChange}
            error={!!errors.price}
            helperText={errors.price}
            fullWidth
            required
            type="number"
          />
          <InputField
            label="Stock"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            error={!!errors.stock}
            helperText={errors.stock}
            fullWidth
            required
            type="number"
          />
          <div style={{ marginTop: 16 }}>
            <Button color="primary" type="submit">
              {id ? "Update Product" : "Save Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
