import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";
import { defaultRangeKeys } from "@/lib/dates";
import { getErrorMessage } from "@/lib/api-error";

/** Report for the date range and account in the URL (?from&to&accountId). Amounts stay in milliunits. */
export const useGetReport = () => {
  const params = useSearchParams();
  const fallback = defaultRangeKeys();
  const from = params.get("from") || fallback.from;
  const to = params.get("to") || fallback.to;
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
  const fallback = defaultRangeKeys();
  const query = new URLSearchParams({
    from: params.get("from") || fallback.from,
    to: params.get("to") || fallback.to,
  });
  const accountId = params.get("accountId");
  if (accountId) query.set("accountId", accountId);
  return `/api/reports/export?${query.toString()}`;
};
