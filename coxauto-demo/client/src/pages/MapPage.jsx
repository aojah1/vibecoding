import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon paths under Vite builds
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

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
  return { data, err, loading, setData };
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !Array.isArray(points) || points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.15));
  }, [map, points]);
  return null;
}

export default function MapPage() {
  const [vehLimit, setVehLimit] = useState(1000);
  const [onlyEVLanes, setOnlyEVLanes] = useState(true);
  const [addr, setAddr] = useState("");
  const [nearest, setNearest] = useState(null);
  const [nLoading, setNLoading] = useState(false);
  const [nErr, setNErr] = useState(null);

  const vehUrl = useMemo(() => `/api/vehicles/locations?limit=${vehLimit}`, [vehLimit]);
  const lanesUrl = useMemo(() => `/api/lanes${onlyEVLanes ? "?ev=Y" : ""}`, [onlyEVLanes]);

  const vehicles = useJson(vehUrl, [vehUrl]);
  const lanes = useJson(lanesUrl, [lanesUrl]);

  async function findNearest() {
    setNLoading(true);
    setNErr(null);
    setNearest(null);
    try {
      const u = `/api/lanes/nearest?addr=${encodeURIComponent(addr)}&limit=5`;
      const r = await fetch(u);
      let d = null;
      try {
        d = await r.json();
      } catch {
        d = null;
      }
      if (!r.ok) {
        // Gracefully handle server-side friendly 400 payload if ever returned
        if (r.status === 400 && d) {
          setNearest(d); // expected { origin: null, rows: [], message }
          setNErr(null);
          return;
        }
        throw new Error(`${r.status} ${r.statusText}`);
      }
      setNearest(d);
    } catch (e) {
      setNErr(e.message || String(e));
    } finally {
      setNLoading(false);
    }
  }

  const points = useMemo(() => {
    const vpts = [];
    if (Array.isArray(vehicles.data)) {
      for (const r of vehicles.data) {
        const lat = Number(r.LOCATION_LAT);
        const lon = Number(r.LOCATION_LON);
        if (Number.isFinite(lat) && Number.isFinite(lon)) vpts.push([lat, lon]);
      }
    }

    const lpts = [];
    if (Array.isArray(lanes.data)) {
      for (const r of lanes.data) {
        const lat = Number(r.lat ?? r.LAT);
        const lon = Number(r.lon ?? r.LON);
        if (Number.isFinite(lat) && Number.isFinite(lon)) lpts.push([lat, lon]);
      }
    }

    const npts = [];
    if (Array.isArray(nearest?.rows)) {
      for (const r of nearest.rows) {
        const lat = Number(r.lat ?? r.LAT);
        const lon = Number(r.lon ?? r.LON);
        if (Number.isFinite(lat) && Number.isFinite(lon)) npts.push([lat, lon]);
      }
    }

    const originPt =
      nearest?.origin &&
      Number.isFinite(Number(nearest.origin.lat)) &&
      Number.isFinite(Number(nearest.origin.lon))
        ? [[Number(nearest.origin.lat), Number(nearest.origin.lon)]]
        : [];

    return [...vpts, ...lpts, ...npts, ...originPt];
  }, [vehicles.data, lanes.data, nearest]);

  return (
    <div className="container">
      <h2>Map: Vehicles and Auction Lanes</h2>

      <div
        className="controls"
        style={{ gap: 12, display: "flex", alignItems: "center", flexWrap: "wrap" }}
      >
        <label>
          Vehicle limit:
          <input
            type="number"
            min={10}
            max={5000}
            value={vehLimit}
            onChange={(e) => setVehLimit(Number(e.target.value || 1000))}
            style={{ width: 100, marginLeft: 8 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyEVLanes}
            onChange={(e) => setOnlyEVLanes(e.target.checked)}
          />
          EV-certified lanes only
        </label>

        <span style={{ color: "#a5b1c2" }}>
          Vehicles: {Array.isArray(vehicles.data) ? vehicles.data.length : 0} • Lanes:{" "}
          {Array.isArray(lanes.data) ? lanes.data.length : 0}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="text"
            placeholder="Enter address, city, or zip"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            style={{ minWidth: 320, padding: 6 }}
          />
          <button onClick={findNearest} disabled={nLoading || !addr.trim()}>
            {nLoading ? "Searching..." : "Find EV lanes near address"}
          </button>
          {nErr && <span style={{ color: "#ff7675" }}>Error: {nErr}</span>}
          {nearest?.rows && <span style={{ color: "#7bed9f" }}>Found {nearest.rows.length} lanes</span>}
        </div>
      </div>

      {(vehicles.loading || lanes.loading) && <p>Loading map data...</p>}
      {(vehicles.err || lanes.err) && <p className="error">Error: {vehicles.err || lanes.err}</p>}

      {nearest && Array.isArray(nearest.rows) && nearest.rows.length === 0 && (
        <p style={{ color: "#ffd32a" }}>
          No EV-certified lanes found near that address.{" "}
          {nearest.message ? `(${nearest.message})` : ""}
        </p>
      )}

      <div
        style={{
          height: "70vh",
          width: "100%",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #333"
        }}
      >
        <MapContainer center={[33.77, -84.39]} zoom={4} style={{ height: "100%", width: "100%" }}>
          <>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Lanes as pin markers */}
          {Array.isArray(lanes.data) &&
            lanes.data.map((l) => {
              const lat = Number(l.lat ?? l.LAT);
              const lon = Number(l.lon ?? l.LON);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              const laneId = l.laneId ?? l.LANE_ID;
              const name = l.name ?? l.NAME;
              const ev = l.evCertified ?? l.EV_CERTIFIED;
              return (
                <Marker key={`lane-${laneId}`} position={[lat, lon]}>
                  <Popup>
                    <div>
                      <strong>{name}</strong>
                      <div>EV Certified: {String(ev)}</div>
                      <div>Lane ID: {laneId}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Origin marker (from address) */}
          {nearest?.origin &&
            Number.isFinite(Number(nearest.origin.lat)) &&
            Number.isFinite(Number(nearest.origin.lon)) && (
              <CircleMarker
                center={[Number(nearest.origin.lat), Number(nearest.origin.lon)]}
                radius={8}
                pathOptions={{ color: "#0984e3", weight: 2, fillOpacity: 0.6 }}
              >
                <Popup>
                  <div>
                    <strong>Search origin</strong>
                    <div>
                      Lat/Lon: {Number(nearest.origin.lat).toFixed(5)},{" "}
                      {Number(nearest.origin.lon).toFixed(5)}
                    </div>
                    {addr ? <div>Address: {addr}</div> : null}
                  </div>
                </Popup>
              </CircleMarker>
            )}

          {/* Nearest EV-certified lanes */}
          {Array.isArray(nearest?.rows) &&
            nearest.rows.map((l, i) => {
              const lat = Number(l.lat ?? l.LAT);
              const lon = Number(l.lon ?? l.LON);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              const laneId = l.laneId ?? l.LANE_ID;
              const name = l.name ?? l.NAME;
              const ev = l.evCertified ?? l.EV_CERTIFIED ?? "Y";
              const dist = l.distance ?? l.DISTANCE ?? l.DISTANCE_UNITS ?? l.distance_units;
              return (
                <CircleMarker
                  key={`nearest-lane-${laneId}-${i}`}
                  center={[lat, lon]}
                  radius={7}
                  pathOptions={{ color: "#e17055", weight: 2, fillOpacity: 0.9 }}
                >
                  <Popup>
                    <div>
                      <strong>{name}</strong>
                      <div>EV Certified: {String(ev)}</div>
                      <div>Lane ID: {laneId}</div>
                      {dist != null ? (
                        <div>Distance: {Number(dist).toFixed(2)}</div>
                      ) : null}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* Vehicles as circle markers */}
          {Array.isArray(vehicles.data) &&
            vehicles.data.map((v) => {
              const lat = Number(v.LOCATION_LAT);
              const lon = Number(v.LOCATION_LON);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              return (
                <CircleMarker
                  key={`veh-${v.VEHICLE_ID}`}
                  center={[lat, lon]}
                  radius={5}
                  pathOptions={{ color: "#00d1b2", weight: 1, fillOpacity: 0.7 }}
                >
                  <Popup>
                    <div>
                      <div>
                        <strong>
                          {v.MAKE} {v.MODEL}
                        </strong>{" "}
                        ({v.YEAR})
                      </div>
                      <div>Vehicle ID: {v.VEHICLE_ID}</div>
                      <div>Trim: {v.TRIM}</div>
                      <div>
                        Lat/Lon: {lat.toFixed(4)}, {lon.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* Auto-fit to data */}
          <FitBounds points={points} />
          </>
        </MapContainer>
      </div>
    </div>
  );
}
