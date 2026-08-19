/* <alpha-world-map> — carte du monde réelle (Natural Earth via world-atlas TopoJSON)
   avec corridors animés Chine / Turquie / Japon / Thaïlande / Émirats → RDC.
   Attend que window.d3 + window.topojson soient chargés (tags pinned dans le <helmet>). */
(function () {
  const GOLD = "hsl(42 85% 55%)";
  const HUB = { name: "Kinshasa", lon: 15.31, lat: -4.32, hub: true, label: true };

  const CITIES = [
    { name: "Shanghai", lon: 121.47, lat: 31.23, label: true, group: "CHN" },
    { name: "Guangzhou", lon: 113.26, lat: 23.13, label: true, group: "CHN" },
    { name: "Shenzhen", lon: 114.06, lat: 22.55, label: false, group: "CHN" },
    { name: "Tokyo", lon: 139.69, lat: 35.69, label: true, group: "JPN" },
    { name: "Osaka", lon: 135.5, lat: 34.69, label: false, group: "JPN" },
    { name: "Istanbul", lon: 28.98, lat: 41.01, label: true, group: "TUR" },
    { name: "Izmir", lon: 27.14, lat: 38.42, label: false, group: "TUR" },
    { name: "Bangkok", lon: 100.5, lat: 13.76, label: true, group: "THA" },
    { name: "Dubaï", lon: 55.27, lat: 25.2, label: true, group: "UAE" },
    { name: "Lubumbashi", lon: 27.48, lat: -11.66, label: true, group: "COD" },
    { name: "Matadi", lon: 13.46, lat: -5.82, label: false, group: "COD" },
  ];

  const ROUTES = [
    ["Shanghai", 0], ["Guangzhou", 0.6], ["Shenzhen", 1.2], ["Tokyo", 1.8],
    ["Osaka", 2.4], ["Istanbul", 3.0], ["Izmir", 3.6], ["Bangkok", 4.2], ["Dubaï", 4.8],
  ];

  function ready(cb) {
    if (window.d3 && window.topojson) return cb();
    let n = 0;
    const t = setInterval(() => {
      if (window.d3 && window.topojson) { clearInterval(t); cb(); }
      else if (++n > 400) clearInterval(t);
    }, 50);
  }

  class AlphaWorldMap extends HTMLElement {
    connectedCallback() {
      if (this._done) return;
      this._done = true;
      this.style.display = "block";
      this.style.position = "relative";
      this.style.width = "100%";
      this.style.height = "100%";
      ready(() => this.render());
      window.addEventListener("resize", () => {
        clearTimeout(this._rt);
        this._rt = setTimeout(() => { this.innerHTML = ""; this.render(); }, 250);
      });
    }

    async render() {
      const d3 = window.d3, topojson = window.topojson;
      const w = this.clientWidth || 1200;
      const h = this.clientHeight || 600;
      if (!this._topo) {
        try {
          this._topo = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json");
        } catch (e) { return; }
      }
      const countries = topojson.feature(this._topo, this._topo.objects.countries);

      const projection = d3.geoNaturalEarth1().fitExtent([[16, 26], [w - 16, h - 26]], {
        type: "Sphere",
      });
      const path = d3.geoPath(projection);
      const svg = d3.select(this).append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${w} ${h}`)
        .style("display", "block")
        .style("overflow", "visible");

      const defs = svg.append("defs");
      const glow = defs.append("filter").attr("id", "aw-glow").attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
      glow.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "b");
      const m = glow.append("feMerge");
      m.append("feMergeNode").attr("in", "b");
      m.append("feMergeNode").attr("in", "SourceGraphic");

      // graticule
      svg.append("path")
        .datum(d3.geoGraticule10())
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.045)")
        .attr("stroke-width", 0.6);

      // sphere outline
      svg.append("path").datum({ type: "Sphere" }).attr("d", path)
        .attr("fill", "none").attr("stroke", "rgba(255,255,255,0.07)").attr("stroke-width", 1);

      // land
      svg.append("g").selectAll("path")
        .data(countries.features).enter().append("path")
        .attr("d", path)
        .attr("fill", "hsl(216 34% 13%)")
        .attr("stroke", "hsl(216 30% 19%)")
        .attr("stroke-width", 0.5)
        .each(function (d, i) {
          this.style.opacity = 0;
          this.style.animation = `awFade .9s ${0.15 + (i % 24) * 0.022}s ease forwards`;
        });

      const all = CITIES.concat([HUB]);
      const byName = {};
      all.forEach((c) => (byName[c.name] = c));

      // corridors (great-circle, projected)
      const routeG = svg.append("g");
      ROUTES.forEach(([from, delay]) => {
        const a = byName[from];
        const interp = d3.geoInterpolate([a.lon, a.lat], [HUB.lon, HUB.lat]);
        const coords = d3.range(0, 1.0001, 1 / 96).map(interp);
        const line = { type: "LineString", coordinates: coords };
        const d = path(line);
        if (!d) return;
        routeG.append("path").attr("d", d)
          .attr("fill", "none").attr("stroke", "hsl(42 85% 55% / 0.13)").attr("stroke-width", 1);
        const p = routeG.append("path").attr("d", d)
          .attr("fill", "none").attr("stroke", "hsl(42 85% 55% / 0.55)")
          .attr("stroke-width", 1.2).attr("stroke-linecap", "round");
        const L = p.node().getTotalLength();
        p.attr("stroke-dasharray", `${L * 0.14} ${L}`)
          .attr("stroke-dashoffset", L * 0.14)
          .style("animation", `awDash ${5.5 + delay * 0.12}s ${delay * 0.35}s linear infinite`)
          .style("--aw-len", L);
        p.node().style.setProperty("--aw-l", L * 0.14 + "px");
        p.node().animate(
          [{ strokeDashoffset: L * 0.14 }, { strokeDashoffset: -L }],
          { duration: 5200 + delay * 240, delay: delay * 380, iterations: Infinity, easing: "linear" }
        );

        const dot = routeG.append("circle").attr("r", 2.6).attr("fill", GOLD).attr("filter", "url(#aw-glow)");
        const mo = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
        mo.setAttribute("dur", (5.2 + delay * 0.24) + "s");
        mo.setAttribute("begin", (delay * 0.38) + "s");
        mo.setAttribute("repeatCount", "indefinite");
        mo.setAttribute("path", d);
        mo.setAttribute("rotate", "auto");
        dot.node().appendChild(mo);
      });

      // nodes
      const nodeG = svg.append("g");
      all.forEach((c, i) => {
        const pt = projection([c.lon, c.lat]);
        if (!pt) return;
        const g = nodeG.append("g").attr("transform", `translate(${pt[0]},${pt[1]})`);
        g.node().style.opacity = 0;
        g.node().style.animation = `awPop .7s ${0.9 + i * 0.07}s cubic-bezier(.22,1,.36,1) forwards`;

        if (c.hub) {
          const ring = g.append("circle").attr("r", 6).attr("fill", "none")
            .attr("stroke", GOLD).attr("stroke-width", 1.4);
          ring.node().animate(
            [{ r: 6, opacity: 0.9 }, { r: 26, opacity: 0 }],
            { duration: 2400, iterations: Infinity, easing: "cubic-bezier(.2,.6,.2,1)" }
          );
          const ring2 = g.append("circle").attr("r", 6).attr("fill", "none")
            .attr("stroke", GOLD).attr("stroke-width", 1);
          ring2.node().animate(
            [{ r: 6, opacity: 0.7 }, { r: 26, opacity: 0 }],
            { duration: 2400, delay: 1200, iterations: Infinity, easing: "cubic-bezier(.2,.6,.2,1)" }
          );
          g.append("circle").attr("r", 4.6).attr("fill", GOLD).attr("filter", "url(#aw-glow)");
        } else {
          g.append("circle").attr("r", 2.8).attr("fill", "hsl(42 85% 55% / 0.75)");
        }

        if (c.label) {
          g.append("text")
            .attr("y", c.hub ? -14 : 14)
            .attr("text-anchor", "middle")
            .attr("fill", c.hub ? GOLD : "rgba(255,255,255,0.48)")
            .attr("font-family", "'Barlow Condensed', sans-serif")
            .attr("font-size", c.hub ? 13 : 11)
            .attr("letter-spacing", "0.18em")
            .attr("text-transform", "uppercase")
            .text(c.name.toUpperCase());
        }
      });
    }
  }

  if (!customElements.get("alpha-world-map")) customElements.define("alpha-world-map", AlphaWorldMap);
})();
