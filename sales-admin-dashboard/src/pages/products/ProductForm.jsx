import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const fetchProductById = async (id) => {
  console.log("Fetching product with ID:", id);
};

const initialState = {
  name: "",
  sku: "",
  price: "",
  description: "",
};

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // const dispatch = useDispatch();
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      fetchProductById(id).then((data) => setForm(data));
    }
  }, [id]);

  const validate = () => {
    const errs = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.sku) errs.sku = "SKU is required";
    if (!form.price) errs.price = "Price is required";
    if (!form.description) errs.description = "Description is required";
    return errs;
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    console.log("Form submitted with data:", form);
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
            label="SKU"
            name="sku"
            value={form.sku}
            onChange={handleChange}
            error={!!errors.sku}
            helperText={errors.sku}
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
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            error={!!errors.description}
            helperText={errors.description}
            fullWidth
            required
            type="text"
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
