import {
  computeMonthlyPnl,
  computeYearlyPnl,
  computeProjectProfitability,
  computeDepartmentProfitability,
  computeDepartmentPayroll,
} from "../services/finance-reports.service.js";

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

async function getDepartmentPayroll(req, res) {
  const now = new Date();
  const yearRaw = Number(req.query.year);
  const monthRaw = Number(req.query.month);
  const year = Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 2200 ? yearRaw : now.getFullYear();
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : now.getMonth() + 1;
  const status = req.query.status === "all" ? "all" : "paid";
  const data = await computeDepartmentPayroll({ year, month, status });
  res.json(data);
}

export { getPnl, getProfitability, getDepartmentPayroll };
