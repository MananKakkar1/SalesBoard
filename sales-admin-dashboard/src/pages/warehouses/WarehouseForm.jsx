import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import {
  createWarehouse,
  updateWarehouse,
  fetchWarehouses,
} from "../../features/warehouses/warehouseSlice";

// Helper: fetch warehouse by id from list thunk (mirrors your product page pattern)
const fetchWarehouseById = async (id, dispatch) => {
  const res = await dispatch(fetchWarehouses()).unwrap(); // { data, pagination }
  const list = Array.isArray(res?.data) ? res.data : [];
  return list.find((w) => String(w.id) === String(id));
};

const initialState = {
  name: "",
  latitude: "",
  longitude: "",
  capacity: "",
};

const WarehouseForm = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editing) {
      fetchWarehouseById(id, dispatch).then((data) => {
        if (data) {
          setForm({
            name: data.name ?? "",
            latitude: data.latitude ?? "",
            longitude: data.longitude ?? "",
            capacity: String(data.capacity ?? "0"),
          });
        }
      });
    }
  }, [editing, id, dispatch]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name || form.name.trim() === "") errs.name = "Name is required";
    if (!form.latitude || form.latitude.trim() === "")
      errs.latitude = "Latitude is required";
    if (!form.longitude || form.longitude.trim() === "")
      errs.longitude = "Longitude is required";
    if (form.capacity === "" || form.capacity === null)
      errs.capacity = "Capacity is required";
    else if (isNaN(Number(form.capacity)))
      errs.capacity = "Capacity must be a number";
    else if (Number(form.capacity) < 0)
      errs.capacity = "Capacity must be ≥ 0";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const payload = {
        name: form.name,
        latitude: form.latitude,
        longitude: form.longitude,
        capacity: Number(form.capacity),
      };
      if (editing) {
        await dispatch(updateWarehouse({ id, body: payload })).unwrap();
      } else {
        await dispatch(createWarehouse(payload)).unwrap();
      }
      navigate("/warehouses");
    } catch (error) {
      alert(error?.message || "Failed to save warehouse.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2>{editing ? "Edit Warehouse" : "Add New Warehouse"}</h2>
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
            label="Latitude"
            name="latitude"
            value={form.latitude}
            onChange={handleChange}
            error={!!errors.latitude}
            helperText={errors.latitude}
            fullWidth
            required
            type="text"
          />
          <InputField
            label="Longitude"
            name="longitude"
            value={form.longitude}
            onChange={handleChange}
            error={!!errors.longitude}
            helperText={errors.longitude}
            fullWidth
            required
            type="text"
          />
          <InputField
            label="Capacity"
            name="capacity"
            value={form.capacity}
            onChange={handleChange}
            error={!!errors.capacity}
            helperText={errors.capacity}
            fullWidth
            required
            type="number"
          />
          <div style={{ marginTop: 16 }}>
            <Button color="primary" type="submit">
              {editing ? "Update Warehouse" : "Save Warehouse"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default WarehouseForm;
