import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useEffect, useState } from "react";

const CustomerList = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleNewCustomer = () => {
    navigate("/customers/new");
  };

  const handleEditCustomer = (id) => {
    navigate(`/customers/${id}/edit`);
  };

  const handleDeleteCustomer = (id) => {
    console.log(`Delete customer with ID: ${id}`);
  }

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const response = await fetch("http://localhost:8080/api/customers");
      if (!response.ok) {
        console.error("Failed to fetch customers");
        setLoading(false);
        return;
      }
      const data = await response.json();
      setCustomers(data);
      setLoading(false);
    };
    fetchCustomers();
  }, []);

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
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
                  No customers found.
                </td>
              </tr>
            ) : (
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
                    onClick={handleDeleteCustomer}
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
