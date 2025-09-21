import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWarehouses,
  deleteWarehouse,
} from "../../features/warehouses/warehouseSlice";

const WarehouseList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const warehousesState = useSelector((s) => s.warehouses);
  const warehouses = Array.isArray(warehousesState.list)
    ? warehousesState.list
    : warehousesState.list?.data || []; 
  const pagination = warehousesState.pagination || {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(pagination.page || 1);
  const [pageSize, setPageSize] = useState(pagination.pageSize || 20);

  const loadWarehouses = async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      await dispatch(
        fetchWarehouses({ search, page: currentPage, pageSize: currentPageSize })
      ).unwrap();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWarehouses(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const handleNew = () => navigate("/warehouses/new");
  const handleEdit = (id) => navigate(`/warehouses/${id}/edit`);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this warehouse?")) return;
    setLoading(true);
    try {
      await dispatch(deleteWarehouse(id)).unwrap();
      await loadWarehouses();
    } catch (e) {
      console.error("Delete failed", e);
    }
    setLoading(false);
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    await loadWarehouses(1, pageSize);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadWarehouses(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
    loadWarehouses(1, newSize);
  };

  return (
    <Card>
      <CardHeader>
        <h2>Warehouses</h2>
        <Button color="primary" onClick={handleNew}>
          Add New Warehouse
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
              <th style={{ textAlign: "left", padding: 8 }}>ID</th>
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Latitude</th>
              <th style={{ textAlign: "left", padding: 8 }}>Longitude</th>
              <th style={{ textAlign: "left", padding: 8 }}>Capacity</th>
              <th style={{ textAlign: "left", padding: 8 }}>Products</th>
              <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 8 }}>
                  Loading...
                </td>
              </tr>
            ) : warehouses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 8 }}>
                  No warehouses found.
                </td>
              </tr>
            ) : (
              warehouses.map((w) => (
                <tr key={w.id}>
                  <td style={{ padding: 8 }}>{w.id}</td>
                  <td style={{ padding: 8 }}>{w.name}</td>
                  <td style={{ padding: 8 }}>{w.latitude}</td>
                  <td style={{ padding: 8 }}>{w.longitude}</td>
                  <td style={{ padding: 8 }}>{w.capacity}</td>
                  <td style={{ padding: 8 }}>{w.productsCount}</td>
                  <td style={{ padding: 8 }}>
                    <Button color="primary" size="small" onClick={() => navigate(`/warehouses/${w.id}`)}>
                      View
                    </Button>
                    <Button
                      color="secondary"
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleEdit(w.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      color="secondary"
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleDelete(w.id)}
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
            Page {pagination.page || page} of {pagination.totalPages || 1}
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

export default WarehouseList;
