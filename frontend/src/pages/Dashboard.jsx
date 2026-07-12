import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../services/api";
import { StatCard, Card, Badge } from "../components/UI";

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/dashboard/stats");
        setStats(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const trendData = (stats.monthlyTrend || []).map((m) => ({
    name: `${monthNames[m._id.month - 1]} ${m._id.year}`,
    revenue: m.revenue,
  }));

  const statusMap = Object.fromEntries((stats.invoiceStats || []).map((s) => [s._id, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your workshop's performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon="💰" accent="green" />
        <StatCard label="This Month" value={`₹${stats.monthlyRevenue.toLocaleString()}`} icon="📈" accent="primary" />
        <StatCard label="Pending Jobs" value={stats.pendingOrders} icon="📋" accent="amber" />
        <StatCard label="Low Stock Items" value={stats.lowStockCount} icon="⚠️" accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Revenue Trend (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-800 mb-4">Payment Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge color="green">Paid</Badge>
              <span className="text-sm font-medium">
                {statusMap.paid?.count || 0} (₹{(statusMap.paid?.total || 0).toLocaleString()})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Badge color="amber">Partial</Badge>
              <span className="text-sm font-medium">
                {statusMap.partial?.count || 0} (₹{(statusMap.partial?.total || 0).toLocaleString()})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Badge color="red">Unpaid</Badge>
              <span className="text-sm font-medium">
                {statusMap.unpaid?.count || 0} (₹{(statusMap.unpaid?.total || 0).toLocaleString()})
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Customers</span>
              <span className="font-medium">{stats.totalCustomers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Parts</span>
              <span className="font-medium">{stats.totalParts}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
