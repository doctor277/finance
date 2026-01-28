"use client";

import qs from "query-string";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useGetSummary } from "@/features/summary/api/use-get-summary";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accepts } from "react-papaparse/dist/utils";

export const AccountFilter = () => {
  const router = useRouter();
  const pathname = usePathname();

  const params = useSearchParams();
  const accountId = params.get("accountId") || "all";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const {
    isLoading: isLoadingSummary 
  } = useGetSummary();
  const { data: accounts, isLoading: isLoadingAccounts } = useGetAccounts();

  const onChange = (newValue: string) => {
    const query = {
      accountId: newValue,
      from,
      to,
    };

    if (newValue === "all") {
      query.accountId = "";
    }

    const url = qs.stringifyUrl(
      {
        url: pathname,
        query,
      },
      { skipNull: true, skipEmptyString: true },
    );

    router.push(url);
  };

  return (
    <Select value={accountId} onValueChange={(onChange)} disabled={isLoadingAccounts || isLoadingSummary}>
      <SelectTrigger
        className="
    w-full max-w-[520px] h-10
    rounded-lg px-4
    bg-white/15 hover:bg-white/20
    text-white placeholder:text-white/70
    border border-white/20
    shadow-sm
    focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-0
    data-[state=open]:bg-white/20
  "
      >
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Accounts</SelectItem>
        {accounts?.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
