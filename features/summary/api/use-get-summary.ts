"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";
import { fromMilliunits } from "@/lib/utils";

export const useGetSummary = () => {
  const params = useSearchParams();
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const accountId = params.get("accountId") || "";

  return useQuery({
    queryKey: ["summary", { from, to, accountId }],
    queryFn: async () => {
      const response = await client.api.summary.$get({
        query: { from, to, accountId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }

      const { data } = await response.json();

      return {
        ...data,
        incomeAmount: fromMilliunits(data.incomeAmount),
        expensesAmount: fromMilliunits(data.expensesAmount),
        remainingAmount: fromMilliunits(data.remainingAmount),
        categories: data.categories.map((category) => ({
          ...category,
          value: fromMilliunits(category.value),
        })),
        days: data.days.map((day) => ({
          ...day,
          income: fromMilliunits(day.income),
          expenses: fromMilliunits(day.expenses),
        })),
      };
    },
  });
};
