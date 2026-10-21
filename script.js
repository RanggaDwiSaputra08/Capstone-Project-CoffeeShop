/**
 * ============================================
 * COFFEE SHOP SALES ANALYSIS DASHBOARD
 * Script: Interactive Filters, Charts, Data Processing
 * Uses: Chart.js (loaded via CDN in index.html)
 * ============================================
 */

document.addEventListener("DOMContentLoaded", function () {

  // ===== GLOBAL CHART.JS DEFAULTS =====
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = "#5F6B7A";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.elements.line.tension = 0.35;
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;

  // ===== COLOR PALETTE =====
  const COLORS = {
    primary: "#1B5E20",
    primaryLight: "#43A047",
    red: "#D32F2F",
    redLight: "rgba(211, 47, 47, 0.1)",
    orange: "#EF6C00",
    orangeLight: "rgba(239, 108, 0, 0.15)",
    blue: "#1565C0",
    blueLight: "rgba(21, 101, 192, 0.1)",
    green: "#2E7D32",
    greenLight: "rgba(46, 125, 50, 0.1)",
    gray: "#B0BEC5",
    grayLight: "rgba(176, 190, 197, 0.35)",
    surface: "#FFFFFF",
    text: "#1A1D21",
    textSecondary: "#5F6B7A",
  };

  // ===== MONTH LABELS LOOKUP =====
  const MONTH_NAMES = {
    "all": "Jan - Jun 2024",
    "1": "Januari 2024",
    "2": "Februari 2024",
    "3": "Maret 2024",
    "4": "April 2024",
    "5": "Mei 2024",
    "6": "Juni 2024",
  };

  const MONTH_NAMES_SHORT = {
    "all": "Semua Bulan",
    "1": "Januari",
    "2": "Februari",
    "3": "Maret",
    "4": "April",
    "5": "Mei",
    "6": "Juni",
  };

  // ===== CHART INSTANCES =====
  let lineChartInstance = null;
  let barChartInstance = null;
  let doughnutChartInstance = null;

  // ===== ACTIVE FILTERS STATE =====
  const activeFilters = {
    store: "astoria",
    category: "packaged-chocolate",
    month: "all",
  };

  // Helper mappings
  function getBarStoreKey(storeFilter) {
    if (storeFilter === "astoria") return "Astoria";
    if (storeFilter === "hells-kitchen") return "Hells Kitchen";
    if (storeFilter === "lower-manhattan") return "Lower Manhattan";
    return null;
  }

  function getPenjualanStoreKey(storeFilter) {
    if (storeFilter === "astoria") return "Astoria";
    if (storeFilter === "hells-kitchen") return "Hell's Kitchen";
    if (storeFilter === "lower-manhattan") return "Lower Manhattan";
    return null;
  }

  function getStoreDisplayName(storeFilter) {
    if (storeFilter === "astoria") return "Astoria";
    if (storeFilter === "hells-kitchen") return "Hell's Kitchen";
    if (storeFilter === "lower-manhattan") return "Lower Manhattan";
    return "Semua Toko";
  }

  // ===== DATA PROCESSING HELPERS =====
  // Compute monthly transactions and metrics matrix from penjualan.json
  function parseMonthlyMetrics(salesData) {
    // Structure: { [storeName]: { [month]: { trx, sales, price } } }
    const storeMonthly = {
      "Astoria": {},
      "Hell's Kitchen": {},
      "Lower Manhattan": {},
    };

    salesData.forEach((row) => {
      const store = row["Lokasi Toko"];
      const m = String(row["Bulan Transaksi"]);
      const sales = parseFloat(row["Total Penjualan"] || 0);
      const price = parseFloat(row["Harga Rata-Rata"] || 0);
      const trx = price > 0 ? Math.round(sales / price) : 0;

      if (storeMonthly[store]) {
        storeMonthly[store][m] = { trx, sales, price };
      }
    });

    return storeMonthly;
  }

  // Get transaction count for a store and month
  function getTransactionsCount(storeMonthly, storeFilter, monthFilter) {
    if (monthFilter === "all") {
      if (storeFilter === "all") {
        let total = 0;
        Object.keys(storeMonthly).forEach((s) => {
          Object.values(storeMonthly[s]).forEach((m) => { total += m.trx; });
        });
        return total; // 487
      } else {
        const sKey = getPenjualanStoreKey(storeFilter);
        let total = 0;
        Object.values(storeMonthly[sKey] || {}).forEach((m) => { total += m.trx; });
        return total; // Astoria: 110, HK: 197, LM: 180
      }
    } else {
      if (storeFilter === "all") {
        let total = 0;
        Object.keys(storeMonthly).forEach((s) => {
          if (storeMonthly[s][monthFilter]) {
            total += storeMonthly[s][monthFilter].trx;
          }
        });
        return total;
      } else {
        const sKey = getPenjualanStoreKey(storeFilter);
        return (storeMonthly[sKey] && storeMonthly[sKey][monthFilter])
          ? storeMonthly[sKey][monthFilter].trx
          : 0;
      }
    }
  }

  // ===== DATA LOADING =====
  Promise.all([
    fetch("bar.json").then((res) => res.json()),
    fetch("line.json").then((res) => res.json()),
    fetch("penjualan.json").then((res) => res.json()),
  ])
    .then(([barData, lineData, salesData]) => {
      const storeMonthly = parseMonthlyMetrics(salesData);

      // Store globally for quick access
      window.dashboardData = { barData, lineData, salesData, storeMonthly };

      // Initialize dashboard with default filters
      applyFilters();
    })
    .catch((error) => {
      console.error("Error fetching dashboard data:", error);
    });

  // ===== CHART A: LINE CHART — Tren Penjualan Harian =====
  function renderLineChart(barData, storeMonthly, storeFilter, monthFilter) {
    const ctx = document.getElementById("lineChart").getContext("2d");
    const chartTitleEl = document.getElementById("line-chart-title");
    const chartBadgeEl = document.getElementById("line-chart-badge");

    if (lineChartInstance) lineChartInstance.destroy();

    const isMobile = window.innerWidth <= 768;
    const days = barData.map((d) => isMobile ? d["Day of Week"].slice(0, 3) : d["Day of Week"]);
    const isSingleMonth = monthFilter !== "all";
    const monthText = MONTH_NAMES_SHORT[monthFilter] || "";

    let datasets = [];
    let maxY = 35;

    if (storeFilter === "all") {
      // Comparison of all 3 stores
      if (chartTitleEl) {
        chartTitleEl.textContent = isSingleMonth
          ? `Tren Penjualan Harian Packaged Chocolate — Semua Toko (${monthText} 2024)`
          : "Tren Penjualan Harian Packaged Chocolate — Semua Toko";
      }
      if (chartBadgeEl) {
        chartBadgeEl.textContent = isSingleMonth ? `${monthText} 2024` : "Komparasi 3 Toko";
      }

      // Compute scale per store if single month
      const astoriaTrx = getTransactionsCount(storeMonthly, "astoria", monthFilter);
      const hellsTrx = getTransactionsCount(storeMonthly, "hells-kitchen", monthFilter);
      const lowerTrx = getTransactionsCount(storeMonthly, "lower-manhattan", monthFilter);

      const astoriaScale = isSingleMonth ? astoriaTrx / 110 : 1;
      const hellsScale = isSingleMonth ? hellsTrx / 197 : 1;
      const lowerScale = isSingleMonth ? lowerTrx / 180 : 1;

      const astoriaData = barData.map((d) => Math.max(1, Math.round(d["Astoria"] * astoriaScale)));
      const hellsData = barData.map((d) => Math.max(1, Math.round(d["Hells Kitchen"] * hellsScale)));
      const lowerData = barData.map((d) => Math.max(1, Math.round(d["Lower Manhattan"] * lowerScale)));

      maxY = isSingleMonth ? Math.max(...astoriaData, ...hellsData, ...lowerData) + 4 : 40;

      datasets = [
        {
          label: isMobile ? "Astoria" : `Astoria (Total: ${astoriaTrx})`,
          data: astoriaData,
          borderColor: COLORS.orange,
          backgroundColor: COLORS.orangeLight,
          borderWidth: 2.5,
          pointBackgroundColor: COLORS.surface,
          pointBorderColor: COLORS.orange,
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6.5,
          fill: false,
        },
        {
          label: isMobile ? "Hell's Kitchen" : `Hell's Kitchen (Total: ${hellsTrx})`,
          data: hellsData,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.greenLight,
          borderWidth: 2.5,
          pointBackgroundColor: COLORS.surface,
          pointBorderColor: COLORS.primary,
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6.5,
          fill: false,
        },
        {
          label: isMobile ? "Lower Manhattan" : `Lower Manhattan (Total: ${lowerTrx})`,
          data: lowerData,
          borderColor: COLORS.blue,
          backgroundColor: COLORS.blueLight,
          borderWidth: 2.5,
          pointBackgroundColor: COLORS.surface,
          pointBorderColor: COLORS.blue,
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6.5,
          fill: false,
        },
      ];
    } else {
      // Single store view
      const key = getBarStoreKey(storeFilter);
      const storeName = getStoreDisplayName(storeFilter);

      if (chartTitleEl) {
        chartTitleEl.textContent = isSingleMonth
          ? `Tren Penjualan Harian Packaged Chocolate — ${storeName} (${monthText} 2024)`
          : `Tren Penjualan Harian Packaged Chocolate — ${storeName}`;
      }
      if (chartBadgeEl) {
        chartBadgeEl.textContent = isSingleMonth ? `${monthText} 2024` : "Per Hari";
      }

      // Base 6-month store sales
      const store6MonthTotal = storeFilter === "astoria" ? 110 : (storeFilter === "hells-kitchen" ? 197 : 180);
      const currentTrx = getTransactionsCount(storeMonthly, storeFilter, monthFilter);
      const scale = isSingleMonth ? (currentTrx / store6MonthTotal) : 1;

      // Scale day sales for that specific month
      const storeSales = isSingleMonth
        ? barData.map((d) => Math.max(1, Math.round(d[key] * scale)))
        : barData.map((d) => d[key]);

      const avgDaily = storeSales.reduce((a, b) => a + b, 0) / storeSales.length;

      // Dynamic Y max
      maxY = isSingleMonth ? Math.max(...storeSales) + 3 : (storeFilter === "hells-kitchen" ? 42 : 32);

      const mainColor = storeFilter === "astoria"
        ? COLORS.primary
        : (storeFilter === "hells-kitchen" ? COLORS.primary : COLORS.blue);

      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, storeFilter === "astoria" ? "rgba(27, 94, 32, 0.22)" : "rgba(21, 101, 192, 0.2)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0.01)");

      if (storeFilter === "astoria") {
        const targetDaily = isSingleMonth
          ? Math.max(1, Math.round(avgDaily * 1.4))
          : 22; // Target 22 unit/hari for 6-month period
        const targetLine = new Array(days.length).fill(targetDaily);

        datasets = [
          {
            label: isMobile ? "Penjualan Aktual" : (isSingleMonth ? `Penjualan Astoria ${monthText} (Aktual)` : "Penjualan Astoria (Aktual)"),
            data: storeSales,
            borderColor: mainColor,
            backgroundColor: gradient,
            fill: true,
            borderWidth: 2.5,
            pointBackgroundColor: COLORS.surface,
            pointBorderColor: mainColor,
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            order: 1,
          },
          {
            label: isMobile ? `Target +40% (${targetDaily})` : `Target +40% (${targetDaily} unit/hari)`,
            data: targetLine,
            borderColor: COLORS.red,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            order: 2,
          },
        ];
      } else {
        const avgRounded = avgDaily.toFixed(1);
        const avgLine = new Array(days.length).fill(Number(avgRounded));

        datasets = [
          {
            label: `Penjualan ${storeName} (Aktual)`,
            data: storeSales,
            borderColor: mainColor,
            backgroundColor: gradient,
            fill: true,
            borderWidth: 2.5,
            pointBackgroundColor: COLORS.surface,
            pointBorderColor: mainColor,
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            order: 1,
          },
          {
            label: `Rata-rata (${avgRounded} unit/hari)`,
            data: avgLine,
            borderColor: COLORS.orange,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            order: 2,
          },
        ];
      }
    }

    lineChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: days,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            align: isMobile ? "start" : "end",
            labels: {
              boxWidth: isMobile ? 8 : 10,
              padding: isMobile ? 8 : 16,
              font: {
                size: isMobile ? 10 : 12,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(26, 29, 33, 0.92)",
            titleFont: { weight: "600", size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              title: function (context) {
                const idx = context[0].dataIndex;
                return barData[idx] ? barData[idx]["Day of Week"] : context[0].label;
              },
              label: function (context) {
                return " " + context.dataset.label + ": " + context.parsed.y + " unit";
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { weight: "500", size: isMobile ? 10 : 12 },
              autoSkip: true,
              maxTicksLimit: isMobile ? 8 : 15,
            },
          },
          y: {
            beginAtZero: true,
            max: maxY,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
              drawBorder: false,
            },
            ticks: {
              stepSize: maxY <= 10 ? 2 : 5,
              font: { size: isMobile ? 10 : 12 },
              callback: function (value) {
                return isMobile ? value : value + " unit";
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });
  }

  // ===== CHART B: HORIZONTAL BAR CHART — Perbandingan Toko =====
  function renderBarChart(salesData, monthFilter, storeFilter) {
    const ctx = document.getElementById("barChart").getContext("2d");
    const barBadgeEl = document.getElementById("bar-chart-badge");

    if (barChartInstance) barChartInstance.destroy();

    // Filter by month
    const filteredSales = monthFilter === "all"
      ? salesData
      : salesData.filter((row) => String(row["Bulan Transaksi"]) === String(monthFilter));

    if (barBadgeEl) {
      barBadgeEl.textContent = monthFilter === "all"
        ? "Total 6 Bulan (Jan - Jun)"
        : `Bulan ${MONTH_NAMES_SHORT[monthFilter] || monthFilter}`;
    }

    // Aggregate by store
    const storeMap = {
      "Astoria": 0,
      "Hell's Kitchen": 0,
      "Lower Manhattan": 0,
    };

    filteredSales.forEach((row) => {
      const store = row["Lokasi Toko"];
      const val = parseFloat(row["Total Penjualan"] || 0);
      if (storeMap[store] !== undefined) {
        storeMap[store] += val;
      }
    });

    const storeNames = ["Astoria", "Hell's Kitchen", "Lower Manhattan"];
    const storeSales = storeNames.map((name) => Math.round(storeMap[name] * 100) / 100);

    // Dynamic bar colors based on selected store
    let barColors, borderColors;

    if (storeFilter === "all") {
      barColors = [COLORS.orange, COLORS.primary, COLORS.blue];
      borderColors = [COLORS.orange, COLORS.primary, COLORS.blue];
    } else {
      const activeStoreName = getStoreDisplayName(storeFilter);
      barColors = storeNames.map((name) =>
        name === activeStoreName ? (name === "Astoria" ? COLORS.orange : COLORS.primary) : COLORS.grayLight
      );
      borderColors = storeNames.map((name) =>
        name === activeStoreName ? (name === "Astoria" ? COLORS.orange : COLORS.primary) : COLORS.gray
      );
    }

    barChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: storeNames,
        datasets: [
          {
            label: "Total Penjualan ($)",
            data: storeSales,
            backgroundColor: barColors,
            borderColor: borderColors,
            borderWidth: 1.5,
            borderRadius: 6,
            barThickness: window.innerWidth <= 768 ? 22 : 34,
          },
        ],
      },
      options: {
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(26, 29, 33, 0.92)",
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                return " Total: $" + context.parsed.x.toLocaleString("en-US", { minimumFractionDigits: 2 });
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
              drawBorder: false,
            },
            ticks: {
              callback: function (value) {
                return "$" + value;
              },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { weight: "600", size: window.innerWidth <= 768 ? 11 : 13 },
              color: function (context) {
                const label = context.tick.label;
                const activeStoreName = getStoreDisplayName(storeFilter);
                if (storeFilter !== "all" && label === activeStoreName) {
                  return COLORS.orange;
                }
                return COLORS.textSecondary;
              },
            },
          },
        },
      },
    });
  }

  // ===== CHART C: DOUGHNUT CHART — Preferensi Produk =====
  function renderDoughnutChart(categoryFilter) {
    const ctx = document.getElementById("doughnutChart").getContext("2d");
    const doughnutBadgeEl = document.getElementById("doughnut-chart-badge");
    const noticeBanner = document.getElementById("category-notice-banner");
    const noticeDesc = document.getElementById("notice-category-desc");
    const noticeTitle = document.getElementById("notice-category-title");

    if (doughnutChartInstance) doughnutChartInstance.destroy();

    // Handle Option 2: Category Notice Banner
    if (noticeBanner) {
      if (categoryFilter === "all" || categoryFilter === "packaged-chocolate") {
        noticeBanner.style.display = "none";
      } else {
        noticeBanner.style.display = "flex";
        if (categoryFilter === "coffee") {
          if (noticeTitle) noticeTitle.textContent = "Informasi Kategori Coffee:";
          if (noticeDesc) {
            noticeDesc.innerHTML = "Data transaksi toko di atas difokuskan pada <strong>Packaged Chocolate</strong> (rumusan masalah utama Astoria). Kategori Kopi mendominasi <strong>62%</strong> preferensi pembeli seperti terlihat pada grafik <em>Preferensi Produk</em> di bawah.";
          }
        } else if (categoryFilter === "tea") {
          if (noticeTitle) noticeTitle.textContent = "Informasi Kategori Tea:";
          if (noticeDesc) {
            noticeDesc.innerHTML = "Data transaksi toko di atas difokuskan pada <strong>Packaged Chocolate</strong>. Kategori Teh termasuk dalam porsi <strong>20%</strong> produk pelengkap non-kopi pada grafik <em>Preferensi Produk</em>.";
          }
        } else if (categoryFilter === "bakery") {
          if (noticeTitle) noticeTitle.textContent = "Informasi Kategori Bakery:";
          if (noticeDesc) {
            noticeDesc.innerHTML = "Data transaksi toko di atas difokuskan pada <strong>Packaged Chocolate</strong>. Kategori Bakery termasuk dalam porsi <strong>20%</strong> produk pendamping pada grafik <em>Preferensi Produk</em>.";
          }
        }
      }
    }

    let centerMainText = "Kopi";
    let centerSubText = "Dominan";

    if (doughnutBadgeEl) {
      if (categoryFilter === "all" || categoryFilter === "packaged-chocolate") {
        doughnutBadgeEl.textContent = "Kopi vs Cokelat";
      } else if (categoryFilter === "coffee") {
        doughnutBadgeEl.textContent = "Fokus: Kopi (62%)";
        centerMainText = "62%";
        centerSubText = "Porsi Kopi";
      } else {
        doughnutBadgeEl.textContent = "Kategori: " + categoryFilter.toUpperCase();
        centerMainText = "20%";
        centerSubText = categoryFilter.toUpperCase();
      }
    }

    const preferenceData = {
      labels: ["Produk Kopi", "Packaged Chocolate", "Produk Lainnya"],
      values: [62, 18, 20],
    };

    doughnutChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: preferenceData.labels,
        datasets: [
          {
            data: preferenceData.values,
            backgroundColor: [
              COLORS.primary,
              COLORS.orange,
              COLORS.blueLight,
            ],
            borderColor: [
              COLORS.primary,
              COLORS.orange,
              COLORS.blue,
            ],
            borderWidth: 2,
            hoverOffset: 12,
            spacing: 3,
          },
        ],
      },
      options: {
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: window.innerWidth <= 768 ? 10 : 18,
              font: { size: window.innerWidth <= 768 ? 10.5 : 12, weight: "500" },
              boxWidth: window.innerWidth <= 768 ? 8 : 10,
            },
          },
          tooltip: {
            backgroundColor: "rgba(26, 29, 33, 0.92)",
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((context.parsed / total) * 100).toFixed(1);
                return " " + context.label + ": " + pct + "%";
              },
            },
          },
        },
      },
      plugins: [
        {
          id: "centerText",
          afterDraw: function (chart) {
            const { ctx: drawCtx, chartArea } = chart;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;

            drawCtx.save();
            drawCtx.textAlign = "center";
            drawCtx.textBaseline = "middle";

            drawCtx.font = "500 11px 'Inter', sans-serif";
            drawCtx.fillStyle = COLORS.textSecondary;
            drawCtx.fillText(centerSubText, centerX, centerY - 12);

            drawCtx.font = window.innerWidth <= 768 ? "800 18px 'Inter', sans-serif" : "800 22px 'Inter', sans-serif";
            drawCtx.fillStyle = COLORS.primary;
            drawCtx.fillText(centerMainText, centerX, centerY + 10);

            drawCtx.restore();
          },
        },
      ],
    });
  }

  // ===== COUNTER ANIMATION =====
  function animateCountUp(element, target, prefix = "", suffix = "", decimals = 0, duration = 600) {
    if (!element) return;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * easeOut;
      const formatted = decimals > 0
        ? current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : Math.round(current).toLocaleString("en-US");

      element.textContent = prefix + formatted + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        const finalFormatted = decimals > 0
          ? target.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
          : Math.round(target).toLocaleString("en-US");
        element.textContent = prefix + finalFormatted + suffix;
      }
    }

    requestAnimationFrame(update);
  }

  // ===== UPDATE SCORECARDS & KEY METRICS =====
  function updateScorecards(storeMonthly, salesData, filters) {
    const { store, month } = filters;
    const isSingleMonth = month !== "all";
    const monthShort = MONTH_NAMES_SHORT[month] || "";

    // 1. Transaction count for active store and month
    const currentTrx = getTransactionsCount(storeMonthly, store, month);

    // Month-over-Month calculation if single month selected
    let momText = "";
    let momClass = "sc-trend-neutral";
    if (isSingleMonth) {
      const currentM = parseInt(month, 10);
      if (currentM > 1) {
        const prevTrx = getTransactionsCount(storeMonthly, store, String(currentM - 1));
        if (prevTrx > 0) {
          const diffPct = Math.round(((currentTrx - prevTrx) / prevTrx) * 100);
          if (diffPct > 0) {
            momText = `▲ +${diffPct}% MoM`;
            momClass = "sc-trend-up";
          } else if (diffPct < 0) {
            momText = `▼ ${diffPct}% MoM`;
            momClass = "sc-trend-down";
          } else {
            momText = "= 0% MoM";
            momClass = "sc-trend-neutral";
          }
        }
      } else {
        momText = "Bulan Awal";
        momClass = "sc-trend-neutral";
      }
    }

    // Default Labels & Badges
    let trxLabel = isSingleMonth
      ? `TOTAL TRANSAKSI ASTORIA (${monthShort.toUpperCase()})`
      : "TOTAL TRANSAKSI ASTORIA";
    let kmTrxLabel = isSingleMonth
      ? `Transaksi Astoria (${monthShort})`
      : "Total Transaksi Astoria";
    let trendClass = isSingleMonth ? momClass : "sc-trend-down";
    let trendText = isSingleMonth ? momText : "Terendah";
    let kmBadgeClass = isSingleMonth ? (momClass === "sc-trend-up" ? "km-badge-success" : "km-badge-danger") : "km-badge-danger";
    let kmBadgeText = isSingleMonth ? `${momText} vs Bln Lalu` : "▼ Terendah dari 3 Toko";
    let targetText = "+40%";
    let targetSubText = isSingleMonth ? `Target: ${Math.round(currentTrx * 1.4)} trx` : "Prioritas 6 Bulan";
    let gapTrxCount = Math.round(currentTrx * 1.4) - currentTrx;
    let gapValue = `${gapTrxCount} trx`;
    let gapBadge = "Perlu strategi agresif";

    if (store === "hells-kitchen") {
      trxLabel = isSingleMonth
        ? `TOTAL TRANSAKSI HELL'S KITCHEN (${monthShort.toUpperCase()})`
        : "TOTAL TRANSAKSI HELL'S KITCHEN";
      kmTrxLabel = isSingleMonth
        ? `Transaksi HK (${monthShort})`
        : "Total Transaksi Hell's Kitchen";
      trendClass = isSingleMonth ? momClass : "sc-trend-up";
      trendText = isSingleMonth ? momText : "Tertinggi";
      kmBadgeClass = "km-badge-success";
      kmBadgeText = isSingleMonth ? `${momText}` : "▲ Tertinggi dari 3 Toko";
      targetText = "Benchmark";
      targetSubText = isSingleMonth ? "Performa Teratas" : "Performa Tertinggi";
      gapValue = "0 trx";
      gapBadge = "Target Tercapai";
    } else if (store === "lower-manhattan") {
      trxLabel = isSingleMonth
        ? `TOTAL TRANSAKSI LOWER MANHATTAN (${monthShort.toUpperCase()})`
        : "TOTAL TRANSAKSI LOWER MANHATTAN";
      kmTrxLabel = isSingleMonth
        ? `Transaksi LM (${monthShort})`
        : "Total Transaksi Lower Manhattan";
      trendClass = isSingleMonth ? momClass : "sc-trend-neutral";
      trendText = isSingleMonth ? momText : "Peringkat 2";
      kmBadgeClass = "km-badge-neutral";
      kmBadgeText = isSingleMonth ? `${momText}` : "■ Stabil di 3 Toko";
      targetText = "+10%";
      targetSubText = isSingleMonth ? "Pertahankan Penjualan" : "Pertahankan Pertumbuhan";
      gapValue = "0 trx";
      gapBadge = "Performa Stabil";
    } else if (store === "all") {
      trxLabel = isSingleMonth
        ? `TOTAL TRANSAKSI (3 TOKO - ${monthShort.toUpperCase()})`
        : "TOTAL TRANSAKSI (3 TOKO)";
      kmTrxLabel = isSingleMonth
        ? `Transaksi 3 Toko (${monthShort})`
        : "Total Transaksi (3 Toko)";
      trendClass = isSingleMonth ? momClass : "sc-trend-opportunity";
      trendText = isSingleMonth ? momText : "Akumulasi";
      kmBadgeClass = "km-badge-success";
      kmBadgeText = isSingleMonth ? `● Total Bulan ${monthShort}` : "● 3 Toko NYC";
      targetText = "+20-40%";
      targetSubText = isSingleMonth ? `Target: ${Math.round(currentTrx * 1.3)} trx` : "Target Jaringan Toko";
      gapValue = `${Math.round(currentTrx * 0.3)} trx`;
      gapBadge = "Potensi Peningkatan";
    }

    // Daily Average:
    // If all months: 6-month weekly/daily aggregate (currentTrx / 7)
    // If single month: average per day across 30 days (currentTrx / 30)
    const currentDailyAvg = isSingleMonth ? (currentTrx / 30) : (currentTrx / 7);

    // Filter salesData by month and store for sales amounts
    const filteredSalesMonth = month === "all"
      ? salesData
      : salesData.filter((r) => String(r["Bulan Transaksi"]) === String(month));

    let currentSales = 0;
    let pricesList = [];

    filteredSalesMonth.forEach((row) => {
      const rowStore = row["Lokasi Toko"];
      const rowSales = parseFloat(row["Total Penjualan"] || 0);
      const rowPrice = parseFloat(row["Harga Rata-Rata"] || 0);

      if (store === "all" || rowStore === getPenjualanStoreKey(store)) {
        currentSales += rowSales;
        if (rowPrice > 0) pricesList.push(rowPrice);
      }
    });

    const avgPrice = pricesList.length > 0
      ? pricesList.reduce((a, b) => a + b, 0) / pricesList.length
      : 9.85;

    // Update DOM - Labels
    const scTrxLabelEl = document.getElementById("sc-transaksi-label");
    const kmTrxLabelEl = document.getElementById("km-transaksi-label");
    const kmSalesLabelEl = document.getElementById("km-sales-label");
    const scTargetValEl = document.getElementById("sc-target-value");
    const scTargetTrendEl = document.getElementById("sc-target-trend");
    const scDailyAvgLabelEl = document.getElementById("sc-daily-avg-label");

    if (scTrxLabelEl) scTrxLabelEl.textContent = trxLabel;
    if (kmTrxLabelEl) kmTrxLabelEl.textContent = kmTrxLabel;
    if (scDailyAvgLabelEl) {
      scDailyAvgLabelEl.textContent = isSingleMonth
        ? `RATA-RATA PENJUALAN HARIAN (${monthShort.toUpperCase()})`
        : "RATA-RATA PENJUALAN HARIAN";
    }
    if (kmSalesLabelEl) {
      kmSalesLabelEl.textContent = month === "all"
        ? `Total Sales ${getStoreDisplayName(store)}`
        : `Sales ${getStoreDisplayName(store)} (${monthShort})`;
    }

    // Update Scorecard 1: Transaksi
    const scTrxValEl = document.getElementById("sc-transaksi-value");
    const kmTrxValEl = document.getElementById("km-transaksi-value");
    const scTrxTrendEl = document.getElementById("sc-transaksi-trend");
    const kmTrxBadgeEl = document.getElementById("km-transaksi-badge");

    if (scTrxValEl) animateCountUp(scTrxValEl, currentTrx, "", "", 0, 500);
    if (kmTrxValEl) kmTrxValEl.textContent = currentTrx.toLocaleString("en-US");

    if (scTrxTrendEl) {
      scTrxTrendEl.className = `sc-trend ${trendClass}`;
      scTrxTrendEl.querySelector("span").textContent = trendText;
    }
    if (kmTrxBadgeEl) {
      kmTrxBadgeEl.className = `km-badge ${kmBadgeClass}`;
      kmTrxBadgeEl.textContent = kmBadgeText;
    }

    // Update Scorecard 2: Target
    if (scTargetValEl) scTargetValEl.textContent = targetText;
    if (scTargetTrendEl) scTargetTrendEl.querySelector("span").textContent = targetSubText;

    // Update Scorecard 3: Daily Avg
    const scDailyAvgEl = document.getElementById("sc-daily-avg-value");
    if (scDailyAvgEl) animateCountUp(scDailyAvgEl, currentDailyAvg, "", "", 1, 500);

    // Update Sidebar: Total Sales
    const kmSalesValEl = document.getElementById("km-sales-value");
    if (kmSalesValEl) {
      kmSalesValEl.textContent = "$" + currentSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Update Sidebar: Avg Price
    const kmAvgPriceValEl = document.getElementById("km-avg-price-value");
    if (kmAvgPriceValEl) {
      kmAvgPriceValEl.textContent = "$" + avgPrice.toFixed(2);
    }

    // Update Sidebar: Gap vs Target
    const kmGapValEl = document.getElementById("km-gap-value");
    const kmGapBadgeEl = document.getElementById("km-gap-badge");
    if (kmGapValEl) kmGapValEl.textContent = gapValue;
    if (kmGapBadgeEl) kmGapBadgeEl.textContent = gapBadge;

    // Update Header Date Badge
    const headerDateBadge = document.getElementById("header-date-badge");
    if (headerDateBadge) {
      headerDateBadge.textContent = MONTH_NAMES[month] || "Jan - Jun 2024";
    }
  }

  // ===== APPLY ALL FILTERS =====
  function applyFilters() {
    if (!window.dashboardData) return;

    // Ensure activeFilters matches current dropdown values in DOM
    const filterStoreEl = document.getElementById("filter-store");
    const filterCategoryEl = document.getElementById("filter-category");
    const filterMonthEl = document.getElementById("filter-month");

    if (filterStoreEl) activeFilters.store = filterStoreEl.value;
    if (filterCategoryEl) activeFilters.category = filterCategoryEl.value;
    if (filterMonthEl) activeFilters.month = filterMonthEl.value;

    const { barData, salesData, storeMonthly } = window.dashboardData;

    // Trigger subtle re-animation pulse
    document.querySelectorAll(".scorecard, .chart-card").forEach((card) => {
      card.style.animation = "none";
      card.offsetHeight; // trigger reflow
      card.style.animation = "fadeInUp 0.3s ease forwards";
    });

    // Update charts & scorecards with current filter state
    renderLineChart(barData, storeMonthly, activeFilters.store, activeFilters.month);
    renderBarChart(salesData, activeFilters.month, activeFilters.store);
    renderDoughnutChart(activeFilters.category);
    updateScorecards(storeMonthly, salesData, activeFilters);
    updateQuickFilterChips();
  }

  // ===== UPDATE MOBILE QUICK FILTER CHIPS =====
  function updateQuickFilterChips() {
    const chipStoreText = document.getElementById("chip-store-text");
    const chipCatText = document.getElementById("chip-category-text");
    const chipMonthText = document.getElementById("chip-month-text");

    if (chipStoreText) {
      chipStoreText.textContent = getStoreDisplayName(activeFilters.store);
    }
    if (chipCatText) {
      const catMap = {
        "packaged-chocolate": "Packaged Choc",
        "coffee": "Coffee",
        "tea": "Tea",
        "bakery": "Bakery",
        "all": "Semua Kategori"
      };
      chipCatText.textContent = catMap[activeFilters.category] || activeFilters.category;
    }
    if (chipMonthText) {
      chipMonthText.textContent = MONTH_NAMES_SHORT[activeFilters.month] || "Semua Bulan";
    }
  }

  // ===== FILTER CHANGE EVENT LISTENERS =====
  const filterStore = document.getElementById("filter-store");
  const filterCategory = document.getElementById("filter-category");
  const filterMonth = document.getElementById("filter-month");

  if (filterStore) {
    filterStore.addEventListener("change", function () {
      activeFilters.store = this.value;
      applyFilters();
    });
  }

  if (filterCategory) {
    filterCategory.addEventListener("change", function () {
      activeFilters.category = this.value;
      applyFilters();
    });
  }

  if (filterMonth) {
    filterMonth.addEventListener("change", function () {
      activeFilters.month = this.value;
      applyFilters();
    });
  }

  // ===== SIDEBAR TOGGLE & CLOSE (MOBILE) =====
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const btnHeaderFilter = document.getElementById("btn-header-filter");
  const btnQuickFilterEdit = document.getElementById("btn-quick-filter-edit");
  const chipStore = document.getElementById("chip-store");
  const chipCategory = document.getElementById("chip-category");
  const chipMonth = document.getElementById("chip-month");
  const btnSidebarApply = document.getElementById("btn-sidebar-apply");
  const sidebarClose = document.getElementById("sidebar-close");
  const sidebar = document.getElementById("sidebar");

  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    overlay.classList.add("active");
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    overlay.classList.remove("active");
  }

  if (sidebarToggle) sidebarToggle.addEventListener("click", openSidebar);
  if (btnHeaderFilter) btnHeaderFilter.addEventListener("click", openSidebar);
  if (btnQuickFilterEdit) btnQuickFilterEdit.addEventListener("click", openSidebar);
  if (chipStore) chipStore.addEventListener("click", openSidebar);
  if (chipCategory) chipCategory.addEventListener("click", openSidebar);
  if (chipMonth) chipMonth.addEventListener("click", openSidebar);

  if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
  if (btnSidebarApply) btnSidebarApply.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Resize listener to adapt chart layout when rotating mobile screen
  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.dashboardData) {
        applyFilters();
      }
    }, 250);
  });

  // ===== INTERSECTION OBSERVER FOR SCROLL ANIMATIONS =====
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  const insightsSection = document.querySelector(".insights-section");
  if (insightsSection) {
    observer.observe(insightsSection);
  }

  // ===== TABLE ROW HOVER =====
  const tableRows = document.querySelectorAll("#insights-table tbody tr");
  tableRows.forEach((row) => {
    row.addEventListener("mouseenter", function () {
      this.style.transition = "all 0.2s ease";
    });
  });

  // ===== EXPORT DROPDOWN, PDF, AND CSV HANDLERS =====
  const btnExportDropdown = document.getElementById("btn-export-dropdown");
  const exportMenu = document.getElementById("export-menu");
  const btnExportPdf = document.getElementById("btn-export-pdf");
  const btnDownloadCsv = document.getElementById("btn-download-csv");

  // Toggle export dropdown
  if (btnExportDropdown && exportMenu) {
    btnExportDropdown.addEventListener("click", function (e) {
      e.stopPropagation();
      const isVisible = exportMenu.style.display === "flex";
      exportMenu.style.display = isVisible ? "none" : "flex";
      btnExportDropdown.classList.toggle("active", !isVisible);
    });

    // Close when clicking anywhere outside
    document.addEventListener("click", function (e) {
      if (!btnExportDropdown.contains(e.target) && !exportMenu.contains(e.target)) {
        exportMenu.style.display = "none";
        btnExportDropdown.classList.remove("active");
      }
    });
  }

  // Export to PDF (Native browser print with @media print styling)
  if (btnExportPdf) {
    btnExportPdf.addEventListener("click", function () {
      if (exportMenu) exportMenu.style.display = "none";
      if (btnExportDropdown) btnExportDropdown.classList.remove("active");

      // Give browser 100ms to hide menu before printing
      setTimeout(() => {
        window.print();
      }, 100);
    });
  }

  // Download CSV
  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener("click", function () {
      if (exportMenu) exportMenu.style.display = "none";
      if (btnExportDropdown) btnExportDropdown.classList.remove("active");

      if (!window.dashboardData) return;
      const { salesData } = window.dashboardData;

      const store = activeFilters.store;
      const month = activeFilters.month;
      const storeName = getStoreDisplayName(store);
      const monthText = MONTH_NAMES_SHORT[month] || "Semua Bulan";

      // Filter salesData by selected month and store
      const filtered = salesData.filter((row) => {
        const matchMonth = month === "all" || String(row["Bulan Transaksi"]) === String(month);
        const matchStore = store === "all" || row["Lokasi Toko"] === getPenjualanStoreKey(store);
        return matchMonth && matchStore;
      });

      // Build CSV Headers
      const headers = [
        "Bulan Transaksi",
        "Nama Bulan",
        "Lokasi Toko",
        "Kategori Produk",
        "Estimasi Transaksi (Unit)",
        "Harga Rata-Rata ($)",
        "Total Penjualan ($)",
        "Target Peningkatan (+40%)",
        "Gap vs Target"
      ];

      // Build CSV Rows
      const rows = filtered.map((r) => {
        const m = String(r["Bulan Transaksi"]);
        const mName = MONTH_NAMES_SHORT[m] || ("Bulan " + m);
        const sName = r["Lokasi Toko"];
        const cat = r["Kategori Produk"];
        const price = parseFloat(r["Harga Rata-Rata"] || 0);
        const sales = parseFloat(r["Total Penjualan"] || 0);
        const trx = price > 0 ? Math.round(sales / price) : 0;
        const target = Math.round(trx * 1.4);
        const gap = Math.max(0, target - trx);

        return [
          m,
          mName,
          `"${sName}"`,
          `"${cat}"`,
          trx,
          price.toFixed(2),
          sales.toFixed(2),
          target,
          gap
        ].join(",");
      });

      // Prepend Summary row if multiple records
      const totalSales = filtered.reduce((sum, r) => sum + parseFloat(r["Total Penjualan"] || 0), 0);
      const totalTrx = filtered.reduce((sum, r) => {
        const p = parseFloat(r["Harga Rata-Rata"] || 0);
        const s = parseFloat(r["Total Penjualan"] || 0);
        return sum + (p > 0 ? Math.round(s / p) : 0);
      }, 0);
      const avgPrice = filtered.length > 0
        ? (filtered.reduce((sum, r) => sum + parseFloat(r["Harga Rata-Rata"] || 0), 0) / filtered.length).toFixed(2)
        : "0.00";

      const summaryRow = [
        "ALL",
        `"TOTAL (${monthText})"`,
        `"${storeName}"`,
        `"Packaged Chocolate"`,
        totalTrx,
        avgPrice,
        totalSales.toFixed(2),
        Math.round(totalTrx * 1.4),
        Math.max(0, Math.round(totalTrx * 1.4) - totalTrx)
      ].join(",");

      // Combine into UTF-8 CSV with BOM for Excel compatibility
      const csvContent = "\uFEFF" + [headers.join(","), summaryRow, ...rows].join("\r\n");

      // Trigger browser download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanStoreName = storeName.replace(/[^a-zA-Z0-9]/g, "_");
      const cleanMonth = monthText.replace(/[^a-zA-Z0-9]/g, "_");
      link.setAttribute("href", url);
      link.setAttribute("download", `Coffee_Shop_Report_${cleanStoreName}_${cleanMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

});
