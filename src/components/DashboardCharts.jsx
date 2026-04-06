import React, { useEffect, useState } from "react";
import { getMonthlyFinancialSummaryFYApi } from "../apis/accountApi";
import Chart from "../modals/Chart";

export default function DashboardCharts({ companyId }) {
  const [monthlyFinance, setMonthlyFinance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMonthlyFinance = async () => {
      try {
        setLoading(true);

        const res = await getMonthlyFinancialSummaryFYApi(
          companyId,
          2026,
          controller.signal
        );

        setMonthlyFinance(res.data.summary);
      } catch (error) {
        if (error.name !== "CanceledError") {
          console.error("Monthly finance fetch error", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyFinance();

    return () => controller.abort();
  }, [companyId]);

  if (loading) {
    return <p className="text-gray-500">Loading charts...</p>;
  }

  return (
    <>
      {/* Charts Section */}
      <div className="mb-10 space-y-10">
        {/* Full Width Chart */}
        <div>
          <Chart
            title="Monthly Revenue, Expense & Profit"
            type="bar"
            labels={monthlyFinance.map((d) => d.month)}
            datasets={[
              {
                label: "Expense",
                data: monthlyFinance.map((d) => d.expense),
                backgroundColor: "rgba(239,68,68,0.7)",
              },
              {
                label: "Revenue",
                data: monthlyFinance.map((d) => d.revenue),
                backgroundColor: "rgba(14,165,233,0.7)",
              },
              {
                label: "Profit",
                data: monthlyFinance.map((d) => d.profit),
                backgroundColor: "rgba(34,197,94,0.7)",
              },
            ]}
          />
        </div>

        {/* 2 Charts in One Row */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-10"> */}
          <Chart
            title="Profit Trend"
            type="line"
            labels={monthlyFinance.map((d) => d.month)}
            datasets={[
              {
                label: "Net Profit",
                data: monthlyFinance.map((d) => d.profit),
                borderWidth: 2,
                tension: 0.4,
                borderColor: "rgba(14,165,233,1)",
                backgroundColor: "rgba(14,165,233,0.3)",
              },
            ]}
          />

          {/* Placeholder until real reconciliation API */}
          {/* <Chart
            title="Bank vs Books Reconciliation"
            type="bar"
            labels={monthlyFinance.map((d) => d.month)}
            datasets={[
              {
                label: "Books",
                data: monthlyFinance.map((d) => d.revenue - d.expense),
                backgroundColor: "rgba(239,68,68,0.7)",
              },
            ]}
          /> */}
        {/* </div> */}
      </div>
    </>
  );
}
