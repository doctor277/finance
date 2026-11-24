import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { getErrorMessage } from "@/lib/api-error";

export const useDeleteCategory = (id?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing id");
      const response = await client.api.categories[":id"].$delete({ param: { id } });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to delete category"));
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["category", { id }] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["report"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
