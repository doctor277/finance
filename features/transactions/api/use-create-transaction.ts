import { toast } from "sonner";
import { InferRequestType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { getErrorMessage } from "@/lib/api-error";

type RequestType = InferRequestType<typeof client.api.transactions.$post>["json"];

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api.transactions.$post({ json });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to create transaction"));
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Transaction created");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["report"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
