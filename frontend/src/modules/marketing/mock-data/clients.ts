import type { MarketingClient } from "../types";

export const mockMarketingClients: MarketingClient[] = [
  { id: "c1", company: "BharatFresh Organics", industry: "FMCG", package: "premium", accountManager: "Priya Sharma", platforms: ["instagram", "facebook", "youtube"], monthlyBudgetInr: 250000, renewalDate: "2026-09-15", city: "Mumbai", performanceScore: 88 },
  { id: "c2", company: "TechVista Solutions", industry: "IT Services", package: "enterprise", accountManager: "Rahul Mehta", platforms: ["linkedin", "twitter", "google"], monthlyBudgetInr: 450000, renewalDate: "2026-11-01", city: "Bangalore", performanceScore: 92 },
  { id: "c3", company: "SpiceRoute Kitchens", industry: "Food & Beverage", package: "standard", accountManager: "Ananya Reddy", platforms: ["instagram", "facebook"], monthlyBudgetInr: 85000, renewalDate: "2026-08-20", city: "Hyderabad", performanceScore: 76 },
  { id: "c4", company: "Zenith Realty Group", industry: "Real Estate", package: "premium", accountManager: "Vikram Singh", platforms: ["facebook", "instagram", "google"], monthlyBudgetInr: 320000, renewalDate: "2027-01-10", city: "Delhi NCR", performanceScore: 84 },
  { id: "c5", company: "FitLife Ayurveda", industry: "Health & Wellness", package: "basic", accountManager: "Kavita Nair", platforms: ["instagram", "youtube"], monthlyBudgetInr: 45000, renewalDate: "2026-07-30", city: "Pune", performanceScore: 71 },
  { id: "c6", company: "EduSpark Academy", industry: "EdTech", package: "standard", accountManager: "Arjun Patel", platforms: ["facebook", "linkedin", "youtube"], monthlyBudgetInr: 120000, renewalDate: "2026-10-05", city: "Ahmedabad", performanceScore: 79 },
  { id: "c7", company: "LuxeThreads Boutique", industry: "Fashion", package: "premium", accountManager: "Priya Sharma", platforms: ["instagram", "facebook"], monthlyBudgetInr: 180000, renewalDate: "2026-12-18", city: "Jaipur", performanceScore: 86 },
  { id: "c8", company: "GreenGrid Solar", industry: "Renewable Energy", package: "enterprise", accountManager: "Rahul Mehta", platforms: ["linkedin", "google", "youtube"], monthlyBudgetInr: 380000, renewalDate: "2027-02-28", city: "Chennai", performanceScore: 90 },
  { id: "c9", company: "Mumbai Masala Co.", industry: "FMCG", package: "standard", accountManager: "Ananya Reddy", platforms: ["instagram", "facebook", "youtube"], monthlyBudgetInr: 95000, renewalDate: "2026-09-01", city: "Mumbai", performanceScore: 74 },
  { id: "c10", company: "CloudNine SaaS", industry: "SaaS", package: "premium", accountManager: "Vikram Singh", platforms: ["linkedin", "twitter", "google"], monthlyBudgetInr: 275000, renewalDate: "2026-11-22", city: "Bangalore", performanceScore: 87 },
  { id: "c11", company: "Heritage Handlooms", industry: "Handicrafts", package: "basic", accountManager: "Kavita Nair", platforms: ["instagram", "facebook"], monthlyBudgetInr: 35000, renewalDate: "2026-08-12", city: "Varanasi", performanceScore: 68 },
  { id: "c12", company: "AutoDrive Motors", industry: "Automotive", package: "enterprise", accountManager: "Arjun Patel", platforms: ["facebook", "youtube", "google"], monthlyBudgetInr: 520000, renewalDate: "2027-03-15", city: "Pune", performanceScore: 91 },
  { id: "c13", company: "PureDrop Water", industry: "Beverages", package: "standard", accountManager: "Priya Sharma", platforms: ["instagram", "facebook"], monthlyBudgetInr: 78000, renewalDate: "2026-10-28", city: "Kolkata", performanceScore: 77 },
  { id: "c14", company: "SkillBridge HR", industry: "HR Tech", package: "premium", accountManager: "Rahul Mehta", platforms: ["linkedin", "twitter"], monthlyBudgetInr: 165000, renewalDate: "2026-12-01", city: "Gurgaon", performanceScore: 83 },
  { id: "c15", company: "Nova Diagnostics", industry: "Healthcare", package: "standard", accountManager: "Ananya Reddy", platforms: ["facebook", "google", "linkedin"], monthlyBudgetInr: 110000, renewalDate: "2027-01-05", city: "Chennai", performanceScore: 80 },
  { id: "c16", company: "UrbanNest Interiors", industry: "Interior Design", package: "basic", accountManager: "Vikram Singh", platforms: ["instagram", "facebook"], monthlyBudgetInr: 42000, renewalDate: "2026-07-25", city: "Mumbai", performanceScore: 72 },
  { id: "c17", company: "Farm2Table Direct", industry: "Agriculture", package: "standard", accountManager: "Kavita Nair", platforms: ["facebook", "instagram", "youtube"], monthlyBudgetInr: 88000, renewalDate: "2026-09-30", city: "Nashik", performanceScore: 75 },
  { id: "c18", company: "PixelPlay Gaming", industry: "Gaming", package: "premium", accountManager: "Arjun Patel", platforms: ["youtube", "instagram", "twitter"], monthlyBudgetInr: 210000, renewalDate: "2026-11-08", city: "Bangalore", performanceScore: 89 },
];

export function getClientById(id: string): MarketingClient | undefined {
  return mockMarketingClients.find((c) => c.id === id);
}
