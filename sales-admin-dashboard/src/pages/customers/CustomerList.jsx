import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  fetchCustomers,
  deleteCustomer,
  searchCustomers,
} from "../../features/auth/authSlice";

const DEFAULT_LIMIT = 20;

const CustomerList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const handleNewCustomer = () => {
    navigate("/customers/new");
  };

  const handleEditCustomer = (id) => {
    navigate(`/customers/${id}/edit`);
  };

  const handleDeleteCustomer = async (id) => {
    setLoading(true);
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      fetchPage();
    } catch (error) {
      console.error("Failed to delete customer", error);
    }
    setLoading(false);
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    fetchPage(1, limit, value);
  };

  const handlePageChange = (newPage) => setPage(newPage);
  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

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
          searchCustomers(`${searchValue}&page=${pageNum}&limit=${pageLimit}`)
        ).unwrap();
      } else {
        data = await dispatch(
          fetchCustomers({ page: pageNum, limit: pageLimit })
        ).unwrap();
      }
      // If no data and not on first page, go back one page
      if (Array.isArray(data) && data.length === 0 && pageNum > 1) {
        setPage(pageNum - 1);
        setLoading(false);
        return;
      }
      setCustomers(data);
    } catch (error) {
      setCustomers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line
  }, [dispatch, page, limit]);

  const safeCustomers = customers || [];

  return (
    <Card>
      <CardHeader>
        <h2>Customers</h2>
        <Button color="primary" onClick={handleNewCustomer}>
          Add New Customer
        </Button>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: 16 }}>
          <InputField
            id="search"
            placeholder="Search by name or email"
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
            disabled={safeCustomers.length < limit}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}>ID</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Email</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Phone</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Address</th>
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
            ) : !safeCustomers || safeCustomers.length === 0 ? null : (
              safeCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ padding: "8px" }}>{customer.id}</td>
                  <td style={{ padding: "8px" }}>{customer.name}</td>
                  <td style={{ padding: "8px" }}>{customer.email}</td>
                  <td style={{ padding: "8px" }}>{customer.phone}</td>
                  <td style={{ padding: "8px" }}>{customer.address}</td>
                  <td style={{ padding: "8px" }}>
                    <Button
                      color="primary"
                      size="small"
                      onClick={() => handleEditCustomer(customer.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      color="secondary"
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleDeleteCustomer(customer.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default CustomerList;
