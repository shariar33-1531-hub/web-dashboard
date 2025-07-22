const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOo-23u4-0MMRp5rup1gVnNnf8EAiK_wb6L07VxO3LLsbrHhGnki9sZxzJtrysy8c2KUS6Lr9ls0Iw/pub?output=csv";

const WHO = {
  ph: { min: 6.5, max: 8.5 },
  tds: { max: 600 },
  turbidity: { max: 5 },
  temp: { max: 30 }
};

let charts = {};

function checkStatus(key, value) {
  if (isNaN(value)) return "Unknown";
  if (key === "ph") return (value >= WHO.ph.min && value <= WHO.ph.max) ? "Safe" : "Unsafe";
  return (value <= WHO[key].max) ? "Safe" : "Unsafe";
}

async function fetchData() {
  const res = await fetch(SHEET_URL);
  const csv = await res.text();
  const rows = csv.trim().split("\n").slice(1).map(r => r.split(",").slice(0, 5));
  const data = rows.map(r => ({
    time: r[0],
    ph: parseFloat(r[1]),
    tds: parseFloat(r[2]),
    turbidity: parseFloat(r[3]),
    temp: parseFloat(r[4])
  }));

  updateDashboard(data);
  updateCharts(data);
}

function updateDashboard(data) {
  const latest = data[data.length - 1];
  const recent = data.slice(-100);
  document.getElementById("last-updated").textContent = "Last Updated: " + latest.time;

  const keys = ["ph", "tds", "turbidity", "temp"];

  keys.forEach(key => {
    const val = latest[key];
    const avg = recent.reduce((sum, d) => sum + d[key], 0) / recent.length;
    const status = checkStatus(key, val);
    const html = `
      <h3>${key.toUpperCase()}</h3>
      <p>Latest: <strong>${val.toFixed(2)}</strong></p>
      <p>Avg (Last 100): <strong>${avg.toFixed(2)}</strong></p>
      <p class="${status.toLowerCase()}">${status}</p>
    `;
    document.getElementById(`${key}-card`).innerHTML = html;
  });
}

function updateCharts(data) {
  drawChart("phChart", data, "ph", "pH", "blue");
  drawChart("tdsChart", data, "tds", "TDS (mg/L)", "green");
  drawChart("turbidityChart", data, "turbidity", "Turbidity (NTU)", "orange");
  drawChart("tempChart", data, "temp", "Temperature (°C)", "red");
}

function drawChart(id, data, key, label, color) {
  const ctx = document.getElementById(id).getContext("2d");
  if (charts[key]) charts[key].destroy();

  const labels = data.map(d => d.time.split(" ")[1]); // Just time (no date)
  const values = data.map(d => d[key]);

  charts[key] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `${label} vs Time`
        },
        tooltip: {
          mode: 'index',
          intersect: false
        },
        subtitle: {
          display: true,
          text: getWHODiscussion(key, values[values.length - 1])
        }
      },
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: "Time" },
          ticks: { maxRotation: 0 }
        },
        y: {
          title: { display: true, text: label }
        }
      }
    }
  });
}

function getWHODiscussion(key, val) {
  if (key === "ph") {
    return (val >= WHO.ph.min && val <= WHO.ph.max)
      ? "Within WHO recommended pH (6.5–8.5)"
      : "⚠️ Out of WHO recommended pH (6.5–8.5)";
  }
  return val <= WHO[key].max
    ? `Within WHO recommended limit (${WHO[key].max})`
    : `⚠️ Exceeds WHO recommended limit (${WHO[key].max})`;
}

fetchData();
setInterval(fetchData, 1000);
