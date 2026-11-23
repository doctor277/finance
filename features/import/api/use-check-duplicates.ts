import { InferRequestType } from "hono";
import { useMutation } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { getErrorMessage } from "@/lib/api-error";

type RequestType = InferRequestType<(typeof client.api.transactions)["duplicates"]["$post"]>["json"];

/** Asks the server which rows already exist in the account. No toast: the preview shows the result. */
export const useCheckDuplicates = () =>
  useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api.transactions.duplicates.$post({ json });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Could not check for duplicates"));
      }

      const { data } = await response.json();
      return data.duplicateOf;
    },
  });
