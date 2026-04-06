import React from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, ArcElement } from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { getMonthlyFinancialSummaryFYApi } from "../apis/accountApi";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, ArcElement);

export default function Chart({ title, type, labels, datasets }) {
  const data = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        display: type !== "pie",
      },
    },
  };

  // Special options for pie chart
  const pieOptions = {
    ...options,
    plugins: {
      legend: {
        position: "right",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(context.parsed);
            }
            return label;
          },
        },
      },
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/20 shadow-premium">
      <h2 className="text-lg font-bold text-slate-800 mb-4">{title}</h2>
      <div className="h-80">
        {type === "bar" && <Bar data={data} options={options} />}
        {type === "line" && <Line data={data} options={options} />}
        {type === "pie" && <Pie data={data} options={pieOptions} />}
      </div>
    </div>
  );
}



