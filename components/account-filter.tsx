"use client";

import qs from "query-string";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AccountFilter = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const accountId = params.get("accountId") || "all";

  const { data: accounts, isLoading } = useGetAccounts();

  const onChange = (value: string) => {
    const url = qs.stringifyUrl(
      {
        url: pathname,
        query: {
          accountId: value === "all" ? "" : value,
          from: params.get("from") || "",
          to: params.get("to") || "",
        },
      },
      { skipNull: true, skipEmptyString: true },
    );
    router.push(url);
  };

  return (
    <Select value={accountId} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger aria-label="Account" className="h-9 w-full bg-card sm:w-56">
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {accounts?.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
