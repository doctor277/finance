import { toast } from "sonner";
import { InferRequestType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { getErrorMessage } from "@/lib/api-error";

type RequestType = InferRequestType<typeof client.api.categories.$post>["json"];

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: RequestType) => {
      const response = await client.api.categories.$post({ json });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to create category"));
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
