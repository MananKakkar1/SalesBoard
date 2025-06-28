// This is the CustomerList page, which is the default page linked to the Customers tab in the Sidebar. 
// This page lists all customers and allows CRUD operations to be performed on each customer.
import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCustomers,
  deleteCustomer,
  searchCustomers,
} from "../../features/customers/customerSlice";

const CustomerList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: customers, pagination } = useSelector(
    (state) => state.customers
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const customersArray = Array.isArray(customers) ? customers : [];

  // Navigate to CustomerForm to create a new customer
  const handleNewCustomer = () => {
    navigate("/customers/new");
  };

  // Navigate to CustomerForm to edit a customer based on their CustomerID
  const handleEditCustomer = (id) => {
    navigate(`/customers/${id}/edit`);
  };

  // Delete a customer from the database through the deleteCustomer thunk and fetch all 
  // customers from the database again to show the changes
  const handleDeleteCustomer = async (id) => {
    setLoading(true);
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      await loadCustomers();
    } catch (error) {
      console.error("Failed to delete customer", error);
    }
    setLoading(false);
  };

  // handleSearchChange either searches for specific queries set by 
  // the user or fetches all customers if the search bar is empty
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    setLoading(true);
    try {
      if (value) {
        await dispatch(
          searchCustomers({ query: value, page: 1, pageSize })
        ).unwrap();
      } else {
        await dispatch(fetchCustomers({ page: 1, pageSize })).unwrap();
      }
    } catch (error) {
      console.error("Failed to search customers", error);
    }
    setLoading(false);
  };

  // Sets the page number and calls the backend to loadCustomers from that specific page (Pagination)
  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadCustomers(newPage);
  };

  // Sets the page size from user input and refreshes the page to the first page, acting as a page refresh (Pagination)
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
    loadCustomers(1, newPageSize);
  };

  // loadCustomers fetches customers from the backend with 2 optional parameters:
  // currentPage: The current page number
  // currentPageSize: Number of customers to be displayed on this page
  // It returns the customers that fit on the current page
  const loadCustomers = async (
    currentPage = page,
    currentPageSize = pageSize
  ) => {
    setLoading(true);
    try {
      if (search) {
        await dispatch(
          searchCustomers({
            query: search,
            page: currentPage,
            pageSize: currentPageSize,
          })
        ).unwrap();
      } else {
        await dispatch(
          fetchCustomers({
            page: currentPage,
            pageSize: currentPageSize,
          })
        ).unwrap();
      }
    } catch (error) {
      console.error("Failed to load customers", error);
    }
    setLoading(false);
  };

  // Update customers from backend on refresh
  useEffect(() => {
    loadCustomers();
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
            ) : !customersArray || customersArray.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
                  No customers found.
                </td>
              </tr>
            ) : (
              customersArray.map((customer) => (
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
            Page {pagination.page} of {pagination.totalPages || 1}
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

export default CustomerList;
