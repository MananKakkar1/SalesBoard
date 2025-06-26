import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import {
  createCustomer,
  updateCustomer,
} from "../../features/customers/customerSlice";
import api from "../../services/api";

const fetchCustomerById = async (id) => {
  const response = await api.get(`/api/customers/${id}`);
  return response.data;
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
  const dispatch = useDispatch();

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

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+1\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
    const addressRegex = /^.{5,}$/;
    const errs = {};
    if (!form.name) {
      errs.name = "Name is required";
    }
    if (!form.email) {
      errs.email = "Email is required";
    } else if (!emailRegex.test(form.email)) {
      errs.email = "Invalid email format";
    }

    if (!form.phone) {
      errs.phone = "Phone is required";
    } else if (!phoneRegex.test(form.phone)) {
      errs.phone = "Invalid US phone number";
    }

    if (!form.address) {
      errs.address = "Address is required";
    } else if (!addressRegex.test(form.address)) {
      errs.address = "Address must be at least 5 characters";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      try {
        if (id) {
          await dispatch(updateCustomer({ id, customerData: form })).unwrap();
        } else {
          await dispatch(createCustomer(form)).unwrap();
        }
        navigate("/customers");
      } catch (error) {
        if (error === "UNIQUE constraint failed: customers.email") {
          alert("Email already exists. Please use a different email.");
        } else if (error === "UNIQUE constraint failed: customers.phone") {
          alert("Phone number already exists. Please use a different phone number.");
        } else if (error === "UNIQUE constraint failed: customers.address") {
          alert("Address already exists. Please use a different address.");
        }
      }
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
