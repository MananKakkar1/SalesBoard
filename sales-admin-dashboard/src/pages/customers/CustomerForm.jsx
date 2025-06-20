import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const fetchCustomerById = async (id) => {
  // To be replaced with actual API call
  return {
    name: "John Doe",
    email: "john@example.com",
    phone: "555-123-4567",
    address: "123 Main St",
  };
};

const initialState = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

  // If editing, fetch customer data
  useEffect(() => {
    if (id) {
      fetchCustomerById(id).then((data) => setForm(data));
    }
  }, [id]);

  const validate = () => {
    const errs = {};
    if (!form.name) errs.name = "Name is required";
    if (!form.email) errs.email = "Email is required";
    if (!form.phone) errs.phone = "Phone is required";
    if (!form.address) errs.address = "Address is required";
    return errs;
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      if (id) {
        // Update customer API call
        // Temporary alert for testing
        alert("Customer updated!");
      } else {
        // Create customer API call
        // Temporary alert for testing
        alert("Customer created!");
      }
      navigate("/customers");
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2>{id ? "Edit Customer" : "Add New Customer"}</h2>
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
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
            required
            type="email"
          />
          <InputField
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={!!errors.phone}
            helperText={errors.phone}
            fullWidth
            required
            type="text"
          />
          <InputField
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            error={!!errors.address}
            helperText={errors.address}
            fullWidth
            required
            type="text"
          />
          <div style={{ marginTop: 16 }}>
            <Button color="primary" type="submit">
              {id ? "Update Customer" : "Save Customer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerForm;
