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

const CustomerList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
      if (search) {
        const data = await dispatch(searchCustomers(search)).unwrap();
        setCustomers(data);
      } else {
        const data = await dispatch(fetchCustomers()).unwrap();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Failed to delete customer", error);
    }
    setLoading(false);
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setLoading(true);
    try {
      if (value) {
        const data = await dispatch(searchCustomers(value)).unwrap();
        setCustomers(data);
      } else {
        const data = await dispatch(fetchCustomers()).unwrap();
        setCustomers(data);
      }
    } catch (error) {
      setCustomers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const getCustomers = async () => {
      setLoading(true);
      try {
        const data = await dispatch(fetchCustomers()).unwrap();
        setCustomers(data);
      } catch (error) {
        setCustomers([]);
      }
      setLoading(false);
    };
    getCustomers();
  }, [dispatch]);

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
            ) : !customers || customers.length === 0 ? null : (
              customers.map((customer) => (
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
        {/* Pagination controls here */}
      </CardContent>
    </Card>
  );
};

export default CustomerList;
