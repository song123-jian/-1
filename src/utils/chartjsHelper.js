let chartJsPromise = null
let Chart = null

export async function ensureChartJs() {
  if (Chart) return Chart

  if (!chartJsPromise) {
    chartJsPromise = import('chart.js').then((mod) => {
      const chart = mod.Chart
      chart.register(
        mod.BarController,
        mod.BarElement,
        mod.DoughnutController,
        mod.ArcElement,
        mod.LineController,
        mod.LineElement,
        mod.PointElement,
        mod.CategoryScale,
        mod.LinearScale,
        mod.Tooltip,
        mod.Legend,
        mod.Filler
      )
      Chart = chart
      return chart
    })
  }

  return chartJsPromise
}
