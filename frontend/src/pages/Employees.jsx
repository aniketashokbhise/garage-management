import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Card, Button, Input, Select, Badge } from "../components/UI";

const BACKEND_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const statusColor = { Active: "green", Inactive: "slate" };
const paymentColor = { Paid: "green", Partial: "amber", Pending: "red" };
const roles = ["Mechanic", "Helper", "Manager", "Receptionist"];

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/employees", { params: { search, jobRole, status } });
      setEmployees(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, jobRole, status]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee? This cannot be undone.")) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete employee");
    }
  };

  const markPaid = async (id) => {
    try {
      await api.put(`/employees/${id}/salary-payment`, { paymentStatus: "Paid" });
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update payment status");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-sm text-slate-500">Manage staff, salary, and attendance</p>
        </div>
        <Button onClick={() => navigate("/employees/new")}>+ Add Employee</Button>
      </div>

      <Card>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <Input
            placeholder="Search by name, ID, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={jobRole} onChange={(e) => setJobRole(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : employees.length === 0 ? (
          <p className="text-slate-500 text-sm">No employees found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4 hidden sm:table-cell">Role</th>
                  <th className="py-2 pr-4 hidden md:table-cell">Mobile</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2 pr-4 hidden lg:table-cell">Attendance</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4">
                      <Link to={`/employees/${e._id}`} className="flex items-center gap-3 hover:text-primary-600">
                        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400">
                          {e.photo ? (
                            <img src={`${BACKEND_ORIGIN}${e.photo}`} alt={e.name} className="w-full h-full object-cover" />
                          ) : (
                            e.name?.[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{e.name}</p>
                          <p className="text-xs text-slate-400">{e.employeeId}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 hidden sm:table-cell">{e.jobRole}</td>
                    <td className="py-2 pr-4 text-slate-600 hidden md:table-cell">{e.mobile}</td>
                    <td className="py-2 pr-4">
                      <Badge color={statusColor[e.status]}>{e.status}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge color={paymentColor[e.salary?.paymentStatus]}>{e.salary?.paymentStatus}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 hidden lg:table-cell">
                      {e.attendance?.attendancePercentage ?? 0}%
                    </td>
                    <td className="py-2 pr-4 text-right space-x-2 whitespace-nowrap">
                      {e.salary?.paymentStatus !== "Paid" && (
                        <button
                          onClick={() => markPaid(e._id)}
                          className="text-green-600 hover:underline text-xs font-medium"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/employees/${e._id}/edit`)}
                        className="text-primary-600 hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e._id)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
