import { useState } from "react";
import { ForceGraph2D } from "react-force-graph";

export default function SimilarGraphPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [limit, setLimit] = useState(10);
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    const idNum = Number(vehicleId);
    if (!Number.isFinite(idNum)) {
      setErr("Enter a numeric vehicle id");
      return;
    }
    setErr(null);
    setLoading(true);
    setGraph({ nodes: [], links: [] });
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      const r = await fetch(`/api/vehicles/${encodeURIComponent(idNum)}/similar?${params.toString()}`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const rows = await r.json();

      const centerId = `veh-${idNum}`;
      const nodes = [{ id: centerId, name: `Vehicle ${idNum}`, group: 1 }];

      for (const v of rows) {
        const nid = `veh-${v.VEHICLE_ID}`;
        nodes.push({
          id: nid,
          name: `${v.MAKE} ${v.MODEL} (${v.TRIM || ""})`,
          group: 2,
          sim: Number(v.SIM)
        });
      }

      const links = rows.map((v) => ({
        source: centerId,
        target: `veh-${v.VEHICLE_ID}`,
        value: 1 / (Number(v.SIM) + 0.0001)
      }));

      setGraph({ nodes, links });
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Similarity Graph</h2>
      <div className="controls" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Vehicle ID:
          <input
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="e.g. 1"
            style={{ marginLeft: 8, width: 120 }}
          />
        </label>
        <label>
          Limit:
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 10))}
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>
        <button onClick={load} disabled={loading || !vehicleId.trim()}>
          {loading ? "Loading..." : "Build Graph"}
        </button>
        {err && <span className="error">Error: {err}</span>}
      </div>

      <div style={{ height: "70vh", width: "100%", border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
        <ForceGraph2D
          graphData={graph}
          nodeLabel={(n) => n.name || n.id}
          nodeAutoColorBy="group"
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={(l) => Math.max(0.001, Math.min(0.02, (l.value || 1) * 0.005))}
          cooldownTicks={50}
          onEngineStop={() => {}}
        />
      </div>
    </div>
  );
}
