document.addEventListener("DOMContentLoaded", function () {
  // Fetch data from JSON files
  Promise.all([
    fetch("bar.json").then((response) => response.json()),
    fetch("line.json").then((response) => response.json()),
    fetch("pie.json").then((response) => response.json()),
    fetch("penjualan.json").then((response) => response.json()),
  ])
    .then(([barData, lineData, pieData, salesData]) => {
      // Draw bar chart
      drawBarChart(barData);

      // Draw line chart
      drawLineChart(lineData);

      // Draw pie chart
      drawPieChart(pieData);

      // Draw sales table
      drawSalesTable(salesData);

      // Add event listener for store filter checkboxes
      const storeFilters = document.querySelectorAll(".store-filter");
      storeFilters.forEach((filter) => {
        filter.addEventListener("change", () => {
          drawLineChart(lineData); // Redraw the line chart on filter change
        });
      });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });

  function drawBarChart(barData) {
    var ctx = document.getElementById("barChart1").getContext("2d");
    var barChart1 = new Chart(ctx, {
      type: "bar",
      data: {
        labels: barData.map((entry) => entry["Day of Week"]),
        datasets: [
          {
            label: "Astoria",
            data: barData.map((entry) => entry["Astoria"]),
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
          {
            label: "Hells Kitchen",
            data: barData.map((entry) => entry["Hells Kitchen"]),
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
          {
            label: "Lower Manhattan",
            data: barData.map((entry) => entry["Lower Manhattan"]),
            backgroundColor: "rgba(255, 206, 86, 0.2)",
            borderColor: "rgba(255, 206, 86, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  function drawLineChart(lineData) {
    var ctx = document.getElementById("lineChart").getContext("2d");
    var lineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [
          "06:00",
          "07:00",
          "08:00",
          "09:00",
          "10:00",
          "11:00",
          "12:00",
          "13:00",
          "14:00",
          "15:00",
          "16:00",
          "17:00",
          "18:00",
          "19:00",
          "20:00",
        ], // Explicitly set the labels from 06:00 to 20:00
        datasets: [
          {
            label: "Hell's Kitchen",
            data: lineData
              .filter((entry) => entry["store_location"] === "Hell's Kitchen")
              .map((entry) => entry["Total Quantity Sold"]),
            fill: false,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          },
          {
            label: "Astoria",
            data: lineData
              .filter((entry) => entry["store_location"] === "Astoria")
              .map((entry) => entry["Total Quantity Sold"]),
            fill: false,
            borderColor: "rgb(255, 99, 132)",
            tension: 0.1,
          },
          {
            label: "Lower Manhattan",
            data: lineData
              .filter((entry) => entry["store_location"] === "Lower Manhattan")
              .map((entry) => entry["Total Quantity Sold"]),
            fill: false,
            borderColor: "rgb(54, 162, 235)",
            tension: 0.1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            max: 30,
          },
        },
      },
    });
  }

  function drawPieChart(pieData) {
    var ctx = document.getElementById("pieChart").getContext("2d");
    ctx.canvas.width = 300; // adjust the width
    ctx.canvas.height = 150; // adjust the height
    var pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: pieData.map((entry) => entry["product_detail"]),
        datasets: [
          {
            data: pieData.map((entry) => entry["Unit Price"]),
            backgroundColor: [
              "rgba(255, 99, 132, 0.2)",
              "rgba(54, 162, 235, 0.2)",
              "rgba(255, 206, 86, 0.2)",
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(54, 162, 235, 1)",
              "rgba(255, 206, 86, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {},
      },
    });
  }

  function drawSalesTable(salesData) {
    $(document).ready(function () {
      $("#table-data").DataTable({
        data: salesData,
        columns: [
          { data: "Bulan Transaksi" },
          { data: "Lokasi Toko" },
          { data: "Kategori Produk" },
          { data: "Harga Rata-Rata" },
          { data: "Total Penjualan" },
        ],
      });
    });
  }

  // Get the toggle button and menu container elements
  const toggleBtn = document.querySelector(".toggle-btn");
  const menuContainer = document.querySelector(".menu-container");
  const brand = document.querySelector(".brand");

  toggleBtn.addEventListener("click", () => {
    menuContainer.classList.toggle("show");
    brand.classList.toggle("active");
  });
});
