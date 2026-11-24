import { toast } from "sonner";
import { InferRequestType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { getErrorMessage } from "@/lib/api-error";

type RequestType = InferRequestType<(typeof client.api.transactions)[":id"]["$patch"]>["json"];

export const useEditTransaction = (id?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      if (!id) throw new Error("Missing id");
      const response = await client.api.transactions[":id"].$patch({ param: { id }, json });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to update transaction"));
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Transaction updated");
      queryClient.invalidateQueries({ queryKey: ["transaction", { id }] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["report"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
