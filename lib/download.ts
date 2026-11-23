/** Saves text as a file in the browser (used for CSV exports). */
export function downloadTextFile(filename: string, text: string, type = "text/csv;charset=utf-8") {
  // BOM so Excel opens UTF-8 (accents, €) correctly.
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
