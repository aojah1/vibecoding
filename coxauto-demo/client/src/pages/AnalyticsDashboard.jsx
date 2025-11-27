import { useEffect, useMemo, useState } from "react";

function useJson(url, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!url) return;
    let abort = false;
    setLoading(true);
    fetch(url)
      .then(async (r) => {
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

export default function AnalyticsDashboard() {
  const [limit, setLimit] = useState(25);

  const urlMsrp = useMemo(() => `/api/kpis/price-to-msrp?limit=${limit}`, [limit]);
  const urlDays = useMemo(() => `/api/kpis/days?limit=${limit}`, [limit]);

  const msrp = useJson(urlMsrp, [urlMsrp]);
  const days = useJson(urlDays, [urlDays]);

  const msrpData = useMemo(() => {
    if (!Array.isArray(msrp.data)) return [];
    return msrp.data.map((r) => ({
      MAKE: r.MAKE,
      MODEL: r.MODEL,
      VEHICLES: Number(r.VEHICLES),
      AVG_PRICE_TO_MSRP: Number(r.AVG_PRICE_TO_MSRP)
    }));
  }, [msrp.data]);

  const daysData = useMemo(() => {
    if (!Array.isArray(days.data)) return [];
    return days.data.map((r) => ({
      MAKE: r.MAKE,
      MODEL: r.MODEL,
      VEHICLES: Number(r.VEHICLES),
      AVG_DAYS_IN_STOCK: Number(r.AVG_DAYS_IN_STOCK),
      AVG_DAYS_TO_SALE: Number(r.AVG_DAYS_TO_SALE)
    }));
  }, [days.data]);

  const summary = useMemo(() => {
    const totalVehicles = msrpData.reduce((s, d) => s + (d.VEHICLES || 0), 0);
    const avgPtm = msrpData.length
      ? msrpData.reduce((s, d) => s + (d.AVG_PRICE_TO_MSRP || 0), 0) / msrpData.length
      : 0;
    const avgDaysStock = daysData.length
      ? daysData.reduce((s, d) => s + (d.AVG_DAYS_IN_STOCK || 0), 0) / daysData.length
      : 0;
    const avgDaysToSale = daysData.length
      ? daysData.reduce((s, d) => s + (d.AVG_DAYS_TO_SALE || 0), 0) / daysData.length
      : 0;
    return { totalVehicles, avgPtm, avgDaysStock, avgDaysToSale };
  }, [msrpData, daysData]);

  return (
    <div className="container">
      <h2>Analytics Dashboard</h2>

      <div className="controls" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Limit:
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 25))}
            style={{ width: 100, marginLeft: 8 }}
          />
        </label>
        {(msrp.loading || days.loading) && <span>Loading data...</span>}
        {(msrp.err || days.err) && <span className="error">Error: {msrp.err || days.err}</span>}
        {!msrp.loading && !days.loading && !msrp.err && !days.err && (
          <span style={{ color: "#a5b1c2" }}>
            MSRP rows: {msrpData.length} • Days rows: {daysData.length}
          </span>
        )}
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#151515", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
          <div style={{ color: "#a5b1c2", fontSize: 12, marginBottom: 6 }}>Total Vehicles (sampled)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.totalVehicles.toLocaleString()}</div>
        </div>
        <div style={{ background: "#151515", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
          <div style={{ color: "#a5b1c2", fontSize: 12, marginBottom: 6 }}>Avg Price to MSRP</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.avgPtm.toFixed(3)}</div>
        </div>
        <div style={{ background: "#151515", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
          <div style={{ color: "#a5b1c2", fontSize: 12, marginBottom: 6 }}>Avg Days (Stock / Sale)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.avgDaysStock.toFixed(1)} / {summary.avgDaysToSale.toFixed(1)}</div>
        </div>
      </div>

      {/* Price-to-MSRP table */}
      <section>
        <h3>Price-to-MSRP (by Make/Model)</h3>
        {Array.isArray(msrpData) && msrpData.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Make</th>
                <th>Model</th>
                <th>Vehicles</th>
                <th>Avg Price/MSRP</th>
              </tr>
            </thead>
            <tbody>
              {msrpData.map((r, i) => (
                <tr key={i}>
                  <td>{r.MAKE}</td>
                  <td>{r.MODEL}</td>
                  <td>{r.VEHICLES}</td>
                  <td>{r.AVG_PRICE_TO_MSRP.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !msrp.loading && <p style={{ color: "#a5b1c2" }}>No data.</p>
        )}
      </section>

      {/* Days KPIs table */}
      <section>
        <h3>Days KPIs (by Make/Model)</h3>
        {Array.isArray(daysData) && daysData.length > 0 ? (
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
              {daysData.map((r, i) => (
                <tr key={i}>
                  <td>{r.MAKE}</td>
                  <td>{r.MODEL}</td>
                  <td>{r.VEHICLES}</td>
                  <td>{r.AVG_DAYS_IN_STOCK.toFixed(1)}</td>
                  <td>{r.AVG_DAYS_TO_SALE.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !days.loading && <p style={{ color: "#a5b1c2" }}>No data.</p>
        )}
      </section>
    </div>
  );
}
