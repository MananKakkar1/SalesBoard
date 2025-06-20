import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const CustomerList = () => {
  const navigate = useNavigate();

  const handleNewCustomer = () => {
    navigate("/customers/new");
  };

  const handleEditCustomer = () => {
    navigate("/customers/:id");
  }

  // const [search, setSearch] = useState('');
  // const handleSearchChange = (e) => setSearch(e.target.value);

  return (
    <Card>
      <CardHeader>
        <h2>Customers</h2>
        <Button color="primary" onClick={handleEditCustomer}>
          Update Customer Information
        </Button>
        <Button color="primary" onClick={handleNewCustomer}>
          Add New Customer
        </Button>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: 16 }}>
          <InputField
            id="search"
            placeholder="Search by name or email"
            // value={search}
            // onChange={handleSearchChange}
            fullWidth
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>{/* Customer data here */}</tbody>
        </table>
        {/* Pagination controls here */}
      </CardContent>
    </Card>
  );
};

export default CustomerList;
