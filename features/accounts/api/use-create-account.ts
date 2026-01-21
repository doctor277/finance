import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.accounts.$post>;
type RequestType = InferRequestType<typeof client.api.accounts.$post>["json"];

async function safeJson(response: Response) {
  try {
    // Some responses can be empty or not JSON; this avoids throwing.
    return await response.json();
  } catch {
    return null;
  }
}

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts.$post({ json });

      const data = await safeJson(response);

      // If server returned a non-2xx, throw a real error
      if (!response.ok) {
        const message =
          (data && (data.error || data.message)) || "Failed to create account";
        throw new Error(message);
      }

      // If it's 2xx but body is empty, still treat as success
      // (you can return data as-is)
      return data as ResponseType;
    },
    onSuccess: () => {
      toast.success("Account created");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create account");
    },
  });

  return mutation;
};
