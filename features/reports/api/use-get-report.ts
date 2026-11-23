import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";
import { getErrorMessage } from "@/lib/api-error";

/** Report for the date range and account in the URL (?from&to&accountId). Amounts stay in milliunits. */
export const useGetReport = () => {
  const params = useSearchParams();
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const accountId = params.get("accountId") || "";

  return useQuery({
    queryKey: ["report", { from, to, accountId }],
    queryFn: async () => {
      const response = await client.api.reports.$get({ query: { from, to, accountId } });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Failed to load the report"));
      const { data } = await response.json();
      return data;
    },
  });
};

/** URL of the CSV export for the current filters (same-origin, uses the session cookie). */
export const useExportUrl = () => {
  const params = useSearchParams();
  const query = new URLSearchParams();
  for (const key of ["from", "to", "accountId"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return `/api/reports/export${qs ? `?${qs}` : ""}`;
};
