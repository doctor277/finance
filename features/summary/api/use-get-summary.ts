"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";
import { defaultRangeKeys } from "@/lib/dates";
import { getErrorMessage } from "@/lib/api-error";

/** Dashboard figures for the filters in the URL. Amounts stay in integer milliunits. */
export const useGetSummary = () => {
  const params = useSearchParams();
  const fallback = defaultRangeKeys();
  const from = params.get("from") || fallback.from;
  const to = params.get("to") || fallback.to;
  const accountId = params.get("accountId") || "";

  return useQuery({
    queryKey: ["summary", { from, to, accountId }],
    queryFn: async () => {
      const response = await client.api.summary.$get({ query: { from, to, accountId } });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Failed to load the overview"));
      const { data } = await response.json();
      return data;
    },
  });
};
