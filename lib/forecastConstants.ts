export type ForecastUnitType = "CAMP_VILLAGE" | "PARK" | "ALL";
export type ForecastStatusType = "CONFIRM" | "TENTATIVE" | "CANCEL";
export type ForecastDpStatusType = "BELUM_DP" | "DP_30" | "DP_50" | "DP_CUSTOM" | "LUNAS";

export const LEAD_STATUS_PROBABILITIES: Record<string, number> = {
  "New Lead": 10,
  "Contacted": 15,
  "Qualified": 25,
  "Proposal Sent": 40,
  "Negotiation": 60,
  "Verbal Agreement": 80,
  "Confirmed / Deal": 100,
  "On Hold": 10,
  "Lost / Cancelled": 0,
};
