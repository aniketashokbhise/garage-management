import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { Card, Badge } from "../components/UI";

export default function CustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/customers/${id}`);
        setData(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load customer");
      }
    };
    fetchData();
  }, [id]);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading...</div>;

  const { customer, vehicles } = data;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/customers" className="text-sm text-primary-600 hover:underline">
          ← Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">{customer.name}</h1>
        <p className="text-sm text-slate-500">
          {customer.phone} {customer.email && `· ${customer.email}`}
        </p>
      </div>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-1">Address</h3>
        <p className="text-sm text-slate-600">{customer.address || "Not provided"}</p>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-4">Vehicles</h3>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-500">No vehicles registered for this customer.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {vehicles.map((v) => (
              <Link
                key={v._id}
                to={`/vehicles/${v._id}`}
                className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50/30 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-800">
                      {v.brand} {v.model}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{v.regNumber}</p>
                  </div>
                  <Badge color="blue">{v.type}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
