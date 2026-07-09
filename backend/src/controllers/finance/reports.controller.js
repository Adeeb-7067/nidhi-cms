import {
  computeMonthlyPnl,
  computeYearlyPnl,
  computeProjectProfitability,
  computeDepartmentProfitability,
} from "../../services/finance/finance-reports.service.js";

async function getPnl(req, res) {
  const [monthly, yearly] = await Promise.all([computeMonthlyPnl(), computeYearlyPnl()]);
  res.json({ monthly, yearly });
}

async function getProfitability(req, res) {
  const [projects, departments] = await Promise.all([
    computeProjectProfitability(),
    computeDepartmentProfitability(),
  ]);
  res.json({ projects, departments });
}

export { getPnl, getProfitability };
