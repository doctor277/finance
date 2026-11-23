import { JSX, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * In-page confirmation dialog (never the browser's confirm()).
 * `await confirm()` resolves true on confirm, false on cancel, Escape or close.
 */
export const useConfirm = (
  title: string,
  message: string,
  confirmLabel = "Delete",
): [() => JSX.Element, () => Promise<boolean>] => {
  const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = () => new Promise<boolean>((resolve) => setPromise({ resolve }));

  const settle = (value: boolean) => {
    promise?.resolve(value);
    setPromise(null);
  };

  const ConfirmationDialog = () => (
    <Dialog open={promise !== null} onOpenChange={(open) => !open && settle(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button onClick={() => settle(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={() => settle(true)} className="bg-destructive text-white hover:bg-destructive/90">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [ConfirmationDialog, confirm];
};
