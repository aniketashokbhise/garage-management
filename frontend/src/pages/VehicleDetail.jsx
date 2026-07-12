import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { Card, Badge } from "../components/UI";

const statusColor = { pending: "amber", "in-progress": "blue", completed: "green" };
const paymentColor = { paid: "green", partial: "amber", unpaid: "red" };

export default function VehicleDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/vehicles/${id}`);
        setData(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load vehicle");
      }
    };
    fetchData();
  }, [id]);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading...</div>;

  const { vehicle, serviceHistory, invoices } = data;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/vehicles" className="text-sm text-primary-600 hover:underline">
          ← Back to Vehicles
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">
          {vehicle.brand} {vehicle.model}
        </h1>
        <p className="text-sm text-slate-500">
          {vehicle.regNumber} · Owner: {vehicle.customer?.name}
        </p>
      </div>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-4">Service History</h3>
        {serviceHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No service records yet.</p>
        ) : (
          <div className="space-y-2">
            {serviceHistory.map((s) => (
              <div key={s._id} className="border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.servicesUsed?.map((sv) => sv.name).join(", ") || "No services listed"}
                  </p>
                </div>
                <Badge color={statusColor[s.status]}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-4">Invoices</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Link
                key={inv._id}
                to={`/invoices/${inv._id}`}
                className="border border-slate-200 rounded-lg p-3 flex justify-between items-center hover:border-primary-300 transition"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString()} · ₹{inv.grandTotal.toLocaleString()}
                  </p>
                </div>
                <Badge color={paymentColor[inv.paymentStatus]}>{inv.paymentStatus}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
