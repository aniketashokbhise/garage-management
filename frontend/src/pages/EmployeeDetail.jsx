import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { Card, Badge, Button } from "../components/UI";

const BACKEND_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
const statusColor = { Active: "green", Inactive: "slate" };
const paymentColor = { Paid: "green", Partial: "amber", Pending: "red" };

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState("");

  const fetchEmployee = async () => {
    try {
      const { data } = await api.get(`/employees/${id}`);
      setEmployee(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load employee");
    }
  };

  useEffect(() => {
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this employee? This cannot be undone.")) return;
    try {
      await api.delete(`/employees/${id}`);
      navigate("/employees");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete employee");
    }
  };

  if (error) return <div className="text-red-600">{error}</div>;
  if (!employee) return <div className="text-slate-500">Loading...</div>;

  const { salary = {}, attendance = {} } = employee;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/employees" className="text-sm text-primary-600 hover:underline">
            ← Back to Employees
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center text-lg text-slate-400">
              {employee.photo ? (
                <img
                  src={`${BACKEND_ORIGIN}${employee.photo}`}
                  alt={employee.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                employee.name?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{employee.name}</h1>
              <p className="text-sm text-slate-500">
                {employee.employeeId} · {employee.jobRole}
              </p>
              <div className="flex gap-2 mt-1">
                <Badge color={statusColor[employee.status]}>{employee.status}</Badge>
                <Badge color={paymentColor[salary.paymentStatus]}>{salary.paymentStatus}</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">Employee Information</h3>
          <dl className="text-sm space-y-2">
            <Row label="Mobile Number" value={employee.mobile} />
            <Row label="Email Address" value={employee.email || "—"} />
            <Row label="Address" value={employee.address || "—"} />
            <Row label="Joining Date" value={formatDate(employee.joiningDate)} />
            <Row label="Job Role" value={employee.jobRole} />
            <Row label="Employment Status" value={employee.status} />
          </dl>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Attendance (This Month)</h3>
            <Link to={`/attendance?employee=${id}`} className="text-xs text-primary-600 hover:underline">
              Mark / View History →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <MiniStat label="Present Days" value={attendance.presentDays} accent="green" />
            <MiniStat label="Absent Days" value={attendance.absentDays} accent="red" />
            <MiniStat label="Leave Days" value={attendance.leaveDays} accent="amber" />
            <MiniStat label="Attendance %" value={`${attendance.attendancePercentage ?? 0}%`} accent="primary" />
          </div>
        </Card>

        <Card className="md:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-3">Salary Information</h3>
          <dl className="grid sm:grid-cols-3 gap-3 text-sm">
            <Row label="Monthly Salary" value={money(salary.monthlySalary)} />
            <Row label="Bonus" value={money(salary.bonus)} />
            <Row label="Overtime Pay" value={money(salary.overtimePay)} />
            <Row label="Salary Deductions" value={money(salary.deductions)} />
            <Row label="Salary Advance" value={money(salary.salaryAdvance)} />
            <Row label="Employee Loan" value={money(salary.employeeLoan)} />
            <Row label="Advance Amount Recovered" value={money(salary.advanceAmount)} />
            <Row label="Remaining Loan Balance" value={money(salary.remainingBalance)} />
            <Row label="Last Payment Date" value={formatDate(salary.lastPaymentDate)} />
          </dl>
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Net Salary</span>
            <span className="text-xl font-bold text-slate-800">{money(salary.netSalary)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 font-medium text-right">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  const accentMap = {
    primary: "bg-primary-50 text-primary-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-lg p-3 ${accentMap[accent]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-bold">{value ?? 0}</p>
    </div>
  );
}
