import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import { Card, Select, Badge } from "../components/UI";

const BACKEND_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);

const statusMeta = {
  Present: { icon: "✓", color: "green", label: "Present" },
  Absent: { icon: "✗", color: "red", label: "Absent" },
  Leave: { icon: "🏖", color: "amber", label: "Leave" },
};

const TABS = [
  { id: "mark", label: "Mark Attendance" },
  { id: "history", label: "History" },
  { id: "summary", label: "Monthly Summary" },
];

export default function Attendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("mark");
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");

  const employeeFilter = searchParams.get("employee") || "";

  useEffect(() => {
    api
      .get("/employees")
      .then(({ data }) => setEmployees(data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load employees"));
  }, []);

  // If we arrived here from a specific employee's detail page, jump straight to their history.
  useEffect(() => {
    if (employeeFilter) setTab("history");
  }, [employeeFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="text-sm text-slate-500">Mark daily attendance and review history</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {tab === "mark" && <MarkAttendance employees={employees} />}
      {tab === "history" && (
        <History
          employees={employees}
          employeeFilter={employeeFilter}
          setEmployeeFilter={(val) => {
            const next = new URLSearchParams(searchParams);
            if (val) next.set("employee", val);
            else next.delete("employee");
            setSearchParams(next);
          }}
        />
      )}
      {tab === "summary" && <Summary employees={employees} />}
    </div>
  );
}

function EmployeeAvatar({ employee }) {
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400">
      {employee?.photo ? (
        <img src={`${BACKEND_ORIGIN}${employee.photo}`} alt={employee.name} className="w-full h-full object-cover" />
      ) : (
        employee?.name?.[0]?.toUpperCase()
      )}
    </div>
  );
}

function MarkAttendance({ employees }) {
  const [date, setDate] = useState(todayStr());
  const [statuses, setStatuses] = useState({}); // employeeId -> status for the selected date
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === "Active"), [employees]);

  const fetchDay = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/attendance", { params: { date } });
      const map = {};
      data.forEach((r) => {
        map[r.employee?._id || r.employee] = r.status;
      });
      setStatuses(map);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attendance for this date");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const mark = async (employeeId, status) => {
    setSavingId(employeeId);
    setError("");
    try {
      await api.post("/attendance", { employeeId, date, status });
      setStatuses((prev) => ({ ...prev, [employeeId]: status }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark attendance");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 mb-1 block">Date</span>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        {date === todayStr() && <Badge color="blue">Today</Badge>}
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : activeEmployees.length === 0 ? (
        <p className="text-slate-500 text-sm">No active employees to mark.</p>
      ) : (
        <div className="space-y-2">
          {activeEmployees.map((emp) => {
            const current = statuses[emp._id];
            return (
              <div
                key={emp._id}
                className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3 flex-wrap"
              >
                <Link to={`/employees/${emp._id}`} className="flex items-center gap-3 hover:text-primary-600">
                  <EmployeeAvatar employee={emp} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                    <p className="text-xs text-slate-400">
                      {emp.employeeId} · {emp.jobRole}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {current && <Badge color={statusMeta[current].color}>{statusMeta[current].icon} {statusMeta[current].label}</Badge>}
                  <div className="flex gap-1">
                    {Object.entries(statusMeta).map(([key, meta]) => (
                      <button
                        key={key}
                        disabled={savingId === emp._id}
                        onClick={() => mark(emp._id, key)}
                        title={meta.label}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold border transition disabled:opacity-50 ${
                          current === key
                            ? meta.color === "green"
                              ? "bg-green-600 border-green-600 text-white"
                              : meta.color === "red"
                              ? "bg-red-600 border-red-600 text-white"
                              : "bg-amber-500 border-amber-500 text-white"
                            : "border-slate-300 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {meta.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function History({ employees, employeeFilter, setEmployeeFilter }) {
  const [dateFilter, setDateFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (employeeFilter) params.employeeId = employeeFilter;
      if (dateFilter) params.date = dateFilter;
      else if (monthFilter) params.month = monthFilter;
      const { data } = await api.get("/attendance", { params });
      setRecords(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeFilter, dateFilter, monthFilter]);

  const handleDelete = async (recordId) => {
    if (!window.confirm("Remove this attendance record?")) return;
    try {
      await api.delete(`/attendance/${recordId}`);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove record");
    }
  };

  return (
    <Card>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Select label="Employee" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
          <option value="">All Employees</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name} ({e.employeeId})
            </option>
          ))}
        </Select>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 mb-1 block">Exact Date</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              if (e.target.value) setMonthFilter("");
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 mb-1 block">Month</span>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              if (e.target.value) setDateFilter("");
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : records.length === 0 ? (
        <p className="text-slate-500 text-sm">No attendance records found for these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4 hidden sm:table-cell">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4 text-slate-600">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-2 pr-4">
                    <Link to={`/employees/${r.employee?._id}`} className="flex items-center gap-2 hover:text-primary-600">
                      <EmployeeAvatar employee={r.employee} />
                      <span className="font-medium text-slate-800">{r.employee?.name || "Deleted employee"}</span>
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-slate-600 hidden sm:table-cell">{r.employee?.jobRole}</td>
                  <td className="py-2 pr-4">
                    <Badge color={statusMeta[r.status].color}>
                      {statusMeta[r.status].icon} {statusMeta[r.status].label}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="text-red-600 hover:underline text-xs font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Summary({ employees }) {
  const [month, setMonth] = useState(monthStr());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/attendance/summary", { params: { month } });
      setRows(data.summary || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load monthly summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const totals = rows.reduce(
    (acc, r) => ({
      present: acc.present + r.presentDays,
      absent: acc.absent + r.absentDays,
      leave: acc.leave + r.leaveDays,
    }),
    { present: 0, absent: 0, leave: 0 }
  );

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 mb-1 block">Month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>
        {!loading && rows.length > 0 && (
          <div className="flex gap-4 text-sm text-slate-600">
            <span>
              Total Present: <strong className="text-slate-800">{totals.present}</strong>
            </span>
            <span>
              Total Absent: <strong className="text-slate-800">{totals.absent}</strong>
            </span>
            <span>
              Total Leave: <strong className="text-slate-800">{totals.leave}</strong>
            </span>
          </div>
        )}
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No employees found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4 hidden sm:table-cell">Role</th>
                <th className="py-2 pr-4 text-center">Present</th>
                <th className="py-2 pr-4 text-center">Absent</th>
                <th className="py-2 pr-4 text-center">Leave</th>
                <th className="py-2 pr-4 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4">
                    <Link
                      to={`/employees/${r.employee._id}`}
                      className="flex items-center gap-2 hover:text-primary-600"
                    >
                      <EmployeeAvatar employee={r.employee} />
                      <div>
                        <p className="font-medium text-slate-800">{r.employee.name}</p>
                        <p className="text-xs text-slate-400">{r.employee.employeeId}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-slate-600 hidden sm:table-cell">{r.employee.jobRole}</td>
                  <td className="py-2 pr-4 text-center text-green-700 font-medium">{r.presentDays}</td>
                  <td className="py-2 pr-4 text-center text-red-700 font-medium">{r.absentDays}</td>
                  <td className="py-2 pr-4 text-center text-amber-700 font-medium">{r.leaveDays}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-slate-800">{r.attendancePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
