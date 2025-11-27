import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export default function CustomersGraphPage() {
  const [limit, setLimit] = useState(300);
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const svgRef = useRef(null);
  const wrapperRef = useRef(null);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    return `/api/graph/customers?${p.toString()}`;
  }, [limit]);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    setErr(null);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => {
        if (!abort) {
          const nodes = Array.isArray(d.nodes) ? d.nodes : [];
          const links = Array.isArray(d.links) ? d.links : [];
          setData({ nodes, links });
        }
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
  }, [url]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const wrapper = wrapperRef.current;
    if (!svg.node() || !wrapper) return;

    const width = wrapper.clientWidth || 960;
    const height = Math.max(520, Math.round((wrapper.clientHeight || 720)));

    svg.attr("viewBox", [0, 0, width, height]).attr("width", "100%").attr("height", height);

    svg.selectAll("*").remove();

    const nodes = data.nodes.map((d) => ({ ...d }));
    const links = data.links.map((l) => ({ ...l }));

    // Scales and helpers
    const color = (t) =>
      t === "customer" ? "#0984e3" : t === "vehicle" ? "#00d1b2" : t === "location" ? "#e17055" : "#b2bec3";
    const radius = (t) => (t === "customer" ? 7 : t === "vehicle" ? 6 : t === "location" ? 8 : 5);

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((l) => (l.type === "purchased" ? 70 : 110))
          .strength(0.15)
      )
      .force("charge", d3.forceManyBody().strength(-80))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => radius(d.type) + 6)
      );

    // Draw links
    const link = svg
      .append("g")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.6)
      .attr("stroke-dasharray", (l) => (l.type === "located_at" ? "3,2" : null));

    // Draw nodes
    const node = svg
      .append("g")
      .attr("stroke", "#111")
      .attr("stroke-width", 0.8)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => radius(d.type))
      .attr("fill", (d) => color(d.type))
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .append("title")
      .text((d) => {
        if (d.type === "customer") return `Customer: ${d.label}\n${d.city}, ${d.state}`;
        if (d.type === "vehicle") return `Vehicle: ${d.label}\nVehicle ID: ${d.vehicle_id}`;
        if (d.type === "location") return `Location: ${d.label}\nLane ID: ${d.lane_id}\n(${d.lat?.toFixed?.(4)}, ${d.lon?.toFixed?.(4)})`;
        return d.label || d.id;
      });

    // Labels
    const labels = svg
      .append("g")
      .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
      .attr("font-size", 11)
      .attr("fill", "#dfe6e9")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.label || d.id)
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      svg.selectAll("circle").attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      labels.attr("x", (d) => d.x).attr("y", (d) => d.y - (radius(d.type) + 8));
    });

    // Legend
    const legendData = [
      { key: "customer", label: "Customer", color: color("customer") },
      { key: "vehicle", label: "Vehicle", color: color("vehicle") },
      { key: "location", label: "Location", color: color("location") }
    ];

    const legend = svg
      .append("g")
      .attr("transform", "translate(16,16)")
      .attr("font-size", 12)
      .attr("fill", "#dfe6e9");

    legend
      .selectAll("g")
      .data(legendData)
      .join("g")
      .attr("transform", (_, i) => `translate(0, ${i * 18})`)
      .each(function (d) {
        const g = d3.select(this);
        g.append("rect").attr("width", 12).attr("height", 12).attr("fill", d.color).attr("stroke", "#111");
        g.append("text").attr("x", 18).attr("y", 10).text(d.label);
      });

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="container">
      <h2>Customers — Vehicles — Locations (Graph)</h2>
      <p style={{ color: "#a5b1c2", marginTop: -6 }}>
        Force-directed graph showing customers and the vehicles they purchased, along with nearest lanes/locations.
      </p>

      <div className="controls" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label>
          Limit:
          <input
            type="number"
            min={50}
            max={2000}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 300))}
            style={{ width: 100, marginLeft: 8 }}
          />
        </label>
        {loading && <span>Loading graph...</span>}
        {err && <span className="error">Error: {err}</span>}
        <span style={{ color: "#a5b1c2" }}>
          Nodes: {Array.isArray(data.nodes) ? data.nodes.length : 0} • Links: {Array.isArray(data.links) ? data.links.length : 0}
        </span>
      </div>

      <div ref={wrapperRef} style={{ height: "72vh", width: "100%", borderRadius: 8, overflow: "hidden", border: "1px solid #333" }}>
        <svg ref={svgRef} />
      </div>
    </div>
  );
}
