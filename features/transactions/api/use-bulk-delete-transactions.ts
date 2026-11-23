import { toast } from "sonner";
import { InferRequestType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { getErrorMessage } from "@/lib/api-error";

type RequestType = InferRequestType<(typeof client.api.transactions)["bulk-delete"]["$post"]>["json"];

export const useBulkDeleteTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api.transactions["bulk-delete"].$post({ json });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to delete transactions"));
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Transactions deleted");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
