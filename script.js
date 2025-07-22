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
  document.getElementById("last-updated").textContent = "Last Updated: " + latest.time;

  const keys = ["ph", "tds", "turbidity", "temp"];
  let anyUnsafe = false;

  keys.forEach(key => {
    const val = latest[key];
    const status = checkStatus(key, val);
    if (status === "Unsafe") anyUnsafe = true;
    const html = `
      <h3>${key.toUpperCase()}</h3>
      <p><strong>${val.toFixed(2)}</strong></p>
      <p class="${status.toLowerCase()}">${status}</p>
    `;
    document.getElementById(`${key}-card`).innerHTML = html;
  });

  document.getElementById("alertBtn").style.display = anyUnsafe ? "inline-block" : "none";
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
  charts[key] = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.time),
      datasets: [{
        label,
        data: data.map(d => d[key]),
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Time" }},
        y: { title: { display: true, text: label }}
      }
    }
  });
}

document.getElementById("alertBtn").onclick = () => {
  const body = "Water quality alert based on WHO standards. Please check the dashboard for details.";
  window.location.href = `mailto:admin@dphe.gov.bd?subject=Water Quality Alert&body=${encodeURIComponent(body)}`;
};

fetchData();
setInterval(fetchData, 1000); // Refresh every 1 second
