import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import "./App.css";
import MapPage from "./pages/MapPage.jsx";
import AnalyticsDashboard from "./pages/AnalyticsDashboard.jsx";
import CustomersGraphPage from "./pages/CustomersGraphPage.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container">
          <h2>Something went wrong</h2>
          <p className="error">{String(this.state.error)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function useJsonFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!url) return;
    let abort = false;
    setLoading(true);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => {
        if (!abort) setData(d);
      })
      .catch((e) => {
        if (!abort) setErr(e.message || String(e));
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });
    return () => {
      abort = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, err, loading };
}

function KpisPage() {
  const [limit, setLimit] = useState(25);
  const urlMsrp = useMemo(() => `/api/kpis/price-to-msrp?limit=${limit}`, [limit]);
  const urlDays = useMemo(() => `/api/kpis/days?limit=${limit}`, [limit]);
  const msrp = useJsonFetch(urlMsrp, [urlMsrp]);
  const days = useJsonFetch(urlDays, [urlDays]);

  return (
    <div className="container">
      <h2>KPIs</h2>
      <div className="controls">
        <label>
          Limit:
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 25))}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
      </div>

      <section>
        <h3>Price-to-MSRP</h3>
        {msrp.loading && <p>Loading...</p>}
        {msrp.err && <p className="error">Error: {msrp.err}</p>}
        {Array.isArray(msrp.data) && (
          <table>
            <thead>
              <tr>
                <th>Make</th>
                <th>Model</th>
                <th>Vehicles</th>
                <th>Avg Price to MSRP</th>
              </tr>
            </thead>
            <tbody>
              {msrp.data.map((r, i) => (
                <tr key={i}>
                  <td>{r.MAKE}</td>
                  <td>{r.MODEL}</td>
                  <td>{r.VEHICLES}</td>
                  <td>{Number(r.AVG_PRICE_TO_MSRP).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Days KPIs</h3>
        {days.loading && <p>Loading...</p>}
        {days.err && <p className="error">Error: {days.err}</p>}
        {Array.isArray(days.data) && (
          <table>
            <thead>
              <tr>
                <th>Make</th>
                <th>Model</th>
                <th>Vehicles</th>
                <th>Avg Days In Stock</th>
                <th>Avg Days To Sale</th>
              </tr>
            </thead>
            <tbody>
              {days.data.map((r, i) => (
                <tr key={i}>
                  <td>{r.MAKE}</td>
                  <td>{r.MODEL}</td>
                  <td>{r.VEHICLES}</td>
                  <td>{Number(r.AVG_DAYS_IN_STOCK).toFixed(1)}</td>
                  <td>{Number(r.AVG_DAYS_TO_SALE).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (make.trim()) params.set("make", make.trim());
    if (model.trim()) params.set("model", model.trim());
    return `/api/vehicles?${params.toString()}`;
  }, [page, pageSize, make, model]);
  const { data, err, loading } = useJsonFetch(url, [url]);

  return (
    <div className="container">
      <h2>Vehicles</h2>
      <div className="controls">
        <label>
          Make:
          <input value={make} onChange={(e) => setMake(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label style={{ marginLeft: 12 }}>
          Model:
          <input value={model} onChange={(e) => setModel(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label style={{ marginLeft: 12 }}>
          Page Size:
          <input
            type="number"
            min={1}
            max={200}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value || 25))}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <button onClick={() => setPage(1)} style={{ marginLeft: 8 }}>
          Apply
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span style={{ margin: "0 8px" }}>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="error">Error: {err}</p>}
      {data && Array.isArray(data.rows) && (
        <table>
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Make</th>
              <th>Model</th>
              <th>Trim</th>
              <th>Market Price</th>
              <th>MSRP</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.VEHICLE_ID}>
                <td>{r.VEHICLE_ID}</td>
                <td>{r.MAKE}</td>
                <td>{r.MODEL}</td>
                <td>{r.TRIM}</td>
                <td>{r.MARKET_PRICE}</td>
                <td>{r.MSRP}</td>
                <td>{r.YEAR}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function VehicleDocPage() {
  const [id, setId] = useState("");
  const [resp, setResp] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesErr, setNotesErr] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  // Description state
  const [desc, setDesc] = useState("");
  const [descLoading, setDescLoading] = useState(false);
  const [descSaving, setDescSaving] = useState(false);
  const [descErr, setDescErr] = useState(null);
  // Description similarity test state
  const [descSearchRows, setDescSearchRows] = useState(null);
  const [descSearchLoading, setDescSearchLoading] = useState(false);
  const [descSearchErr, setDescSearchErr] = useState(null);

  const fetchDoc = () => {
    if (!id.trim()) return;
    setLoading(true);
    setErr(null);
    setResp(null);
    fetch(`/api/vehicles/${encodeURIComponent(id)}/doc`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => setResp(d))
      .catch((e) => setErr(e.message || String(e)))
      .finally(() => setLoading(false));
  };

  const loadNotes = async () => {
    if (!id.trim()) return;
    setNotesErr(null);
    setNotesLoading(true);
    try {
      const r = await fetch(`/api/vehicles/${encodeURIComponent(id)}/notes/doc`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const d = await r.json();
      setNotes(Array.isArray(d.notes) ? d.notes : []);
    } catch (e) {
      setNotesErr(e.message || String(e));
    } finally {
      setNotesLoading(false);
    }
  };

  const addNote = async () => {
    if (!id.trim() || !noteText.trim()) return;
    setSaving(true);
    setNotesErr(null);
    try {
      const r = await fetch(`/api/vehicles/${encodeURIComponent(id)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText })
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      setNoteText("");
      await loadNotes();
    } catch (e) {
      setNotesErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const loadDesc = async () => {
    if (!id.trim()) return;
    setDescLoading(true);
    setDescErr(null);
    try {
      const r = await fetch(`/api/vehicles/${encodeURIComponent(id)}/description`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const d = await r.json();
      setDesc(typeof d.description === "string" ? d.description : "");
    } catch (e) {
      setDescErr(e.message || String(e));
    } finally {
      setDescLoading(false);
    }
  };

  const saveDesc = async () => {
    if (!id.trim()) return;
    setDescSaving(true);
    setDescErr(null);
    try {
      const r = await fetch(`/api/vehicles/${encodeURIComponent(id)}/description`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: desc })
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      // vectors update on server; nothing else to do
    } catch (e) {
      setDescErr(e.message || String(e));
    } finally {
      setDescSaving(false);
    }
  };

  const testDescSearch = async () => {
    const q = (desc || "").trim();
    if (!q) return;
    setDescSearchLoading(true);
    setDescSearchErr(null);
    setDescSearchRows(null);
    try {
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("limit", "5");
      params.set("thr", "0.6");
      const r = await fetch(`/api/vehicles/search?${params.toString()}`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const d = await r.json();
      setDescSearchRows(Array.isArray(d) ? d : []);
    } catch (e) {
      setDescSearchErr(e.message || String(e));
    } finally {
      setDescSearchLoading(false);
    }
  };

  // Auto-load notes/description when id changes
  useEffect(() => {
    if (id.trim()) {
      loadNotes();
      loadDesc();
    } else {
      setNotes([]);
      setDesc("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="container">
      <h2>Vehicle Doc (JSON) + Notes</h2>
      <div className="controls">
        <label>
          Vehicle ID:
          <input value={id} onChange={(e) => setId(e.target.value)} style={{ marginLeft: 8 }} placeholder="e.g. 1001" />
        </label>
        <button onClick={fetchDoc} style={{ marginLeft: 8 }}>
          Fetch
        </button>
        <button onClick={loadNotes} style={{ marginLeft: 8 }}>
          Refresh Notes
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="error">Error: {err}</p>}
      {resp && (
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 6, overflowX: "auto" }}>
          {JSON.stringify(resp, null, 2)}
        </pre>
      )}

      <section style={{ marginTop: 18 }}>
        <h3>Description</h3>
        <p style={{ color: "#a5b1c2", marginTop: -6, marginBottom: 10 }}>
          This description is vector-indexed for similarity search.
        </p>
        {descLoading && <p>Loading description...</p>}
        {descErr && <p className="error">Description error: {descErr}</p>}
        <div className="controls" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            style={{ width: "100%" }}
            placeholder="Write a descriptive summary for this vehicle"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={loadDesc} disabled={!id.trim()}>Refresh</button>
            <button onClick={saveDesc} disabled={!id.trim() || descSaving}>
              {descSaving ? "Saving..." : "Save Description"}
            </button>
            <button onClick={testDescSearch} disabled={!desc.trim()}>
              Test Search with Description
            </button>
          </div>
        </div>

        {descSearchLoading && <p>Testing similarity search...</p>}
        {descSearchErr && <p className="error">Search error: {descSearchErr}</p>}
        {Array.isArray(descSearchRows) && descSearchRows.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>Make</th>
                  <th>Model</th>
                  <th>Similarity</th>
                </tr>
              </thead>
              <tbody>
                {descSearchRows.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor:
                        String(r.VEHICLE_ID) === id.trim() ? "rgba(0,255,0,0.08)" : undefined
                    }}
                  >
                    <td>{r.VEHICLE_ID}</td>
                    <td>{r.MAKE}</td>
                    <td>{r.MODEL}</td>
                    <td>{Number(r.SIM).toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h3>Notes</h3>
        <p style={{ color: "#a5b1c2", marginTop: -6, marginBottom: 10 }}>
          Notes are stored with a lightweight 8-dimension embedding for future natural-language search.
        </p>
        <div className="controls">
          <label style={{ flex: 1 }}>
            Add note:
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter a descriptive note about this vehicle"
              style={{ marginLeft: 8, width: "100%" }}
            />
          </label>
          <button onClick={addNote} disabled={saving || !id.trim() || !noteText.trim()}>
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>

        {notesLoading && <p>Loading notes...</p>}
        {notesErr && <p className="error">Notes error: {notesErr}</p>}
        {notes.length === 0 && !notesLoading && <p style={{ color: "#a5b1c2" }}>No notes yet.</p>}
        {notes.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Text</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n, i) => (
                <tr key={i}>
                  <td data-label="Created">{n.created_at || n.CREATED_AT}</td>
                  <td data-label="Text">{n.text || n.NOTE_TEXT}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function SimilarPage() {
  const [q, setQ] = useState("affordable hybrid suv with advanced safety");
  const [limit, setLimit] = useState(5);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setErr(null);
    setRows(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("limit", String(limit));
      const r = await fetch(`/api/vehicles/search?${params.toString()}`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const d = await r.json();
      setRows(d);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Similar Vehicles (Natural Language Search)</h2>
      <div className="controls">
        <label>
          Prompt:
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. affordable hybrid suv with lane keep" style={{ marginLeft: 8, width: 420 }} />
        </label>
        <label style={{ marginLeft: 12 }}>
          Limit:
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 10))}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <button onClick={run} style={{ marginLeft: 8 }}>
          Search
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {err && <p className="error">Error: {err}</p>}
      {Array.isArray(rows) && (
        <table>
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Make</th>
              <th>Model</th>
              <th>Trim</th>
              <th>Market Price</th>
              <th>Similarity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.VEHICLE_ID}</td>
                <td>{r.MAKE}</td>
                <td>{r.MODEL}</td>
                <td>{r.TRIM}</td>
                <td>{r.MARKET_PRICE}</td>
                <td>{Number(r.SIM).toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LanesPage() {
  const [lat, setLat] = useState("33.77");
  const [lon, setLon] = useState("-84.39");
  const [limit, setLimit] = useState(5);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setErr(null);
    setRows(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("lat", lat);
      params.set("lon", lon);
      params.set("limit", String(limit));
      const r = await fetch(`/api/lanes/nearest?${params.toString()}`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const d = await r.json();
      setRows(d);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Nearest EV-certified Lanes</h2>
      <div className="controls">
        <label>
          Lat:
          <input value={lat} onChange={(e) => setLat(e.target.value)} style={{ marginLeft: 8, width: 120 }} />
        </label>
        <label style={{ marginLeft: 12 }}>
          Lon:
          <input value={lon} onChange={(e) => setLon(e.target.value)} style={{ marginLeft: 8, width: 120 }} />
        </label>
        <label style={{ marginLeft: 12 }}>
          Limit:
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 5))}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <button onClick={run} style={{ marginLeft: 8 }}>
          Search
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {err && <p className="error">Error: {err}</p>}
      {Array.isArray(rows) && (
        <table>
          <thead>
            <tr>
              <th>Lane ID</th>
              <th>Name</th>
              <th>Distance Units</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.LANE_ID}</td>
                <td>{r.NAME}</td>
                <td>{Number(r.DISTANCE_UNITS).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Nav() {
  const nav = useNavigate();
  return (
    <header className="nav">
      <div className="brand" onClick={() => nav("/")}>
        CoxAuto Demo
      </div>
      <nav className="tabs">
        <NavLink to="/dashboard" end className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          Dashboard
        </NavLink>
        <NavLink to="/kpis" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          KPIs
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          Map
        </NavLink>
        <NavLink to="/vehicles" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          Vehicles
        </NavLink>
        <NavLink to="/vehicle-doc" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          Vehicle Doc
        </NavLink>
        <NavLink to="/similar" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          Similar
        </NavLink>
        <NavLink to="/lanes" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          Lanes
        </NavLink>
        <NavLink to="/cust-graph" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
          Customers Graph
        </NavLink>
      </nav>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <ErrorBoundary>
        <main>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/dashboard" element={<AnalyticsDashboard />} />
            <Route path="/kpis" element={<KpisPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicle-doc" element={<VehicleDocPage />} />
            <Route path="/similar" element={<SimilarPage />} />
            <Route path="/lanes" element={<LanesPage />} />
            <Route path="/cust-graph" element={<CustomersGraphPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </ErrorBoundary>
      <footer className="footer">
        Backend: http://localhost:4000 • Frontend: http://localhost:5173
      </footer>
    </BrowserRouter>
  );
}

export default App;
