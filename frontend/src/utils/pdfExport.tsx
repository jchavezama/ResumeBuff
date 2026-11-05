import { FONT_FAMILIES } from "@/constants/resumeThemes";
import type { ResumeTheme, TemplateType } from "@/types/resume";

export const exportResumeToPDF = (
  candidateName: string,
  templateType: TemplateType,
  theme: ResumeTheme
) => {
  const element = document.getElementById("resume-preview");
  if (!element) return;

  const printWindow = window.open("", "_blank", "width=850,height=1100");
  if (!printWindow) return;

  // Clone all active stylesheets from the running Vite app so styles never fail to load
  const headStyles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((node) => node.outerHTML)
    .join("\n");

  // Strip the temporary green approval highlight so the exported PDF is clean
  const cleanHtml = element.innerHTML.replace(/bg-emerald-100\/70/g, "");
  const pageMargin =
    templateType === "starter" ? "0.38in 0.45in" : "0.45in 0.55in";
  const docTitle =
    (candidateName || "Optimized").replace(/\s+/g, "_") + "_Resume";
  const fontConfig = FONT_FAMILIES[theme.fontFamily];

  // Must match the spacing used in ResumePreview so the PDF looks like the preview
  const spacingClass =
    theme.density === "compact"
      ? "space-y-3.5"
      : theme.density === "spacious"
      ? "space-y-6"
      : "space-y-5";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docTitle}</title>
        ${headStyles}
        <style>
          @page {
            size: letter portrait;
            margin: ${pageMargin};
          }
          html, body {
            font-family: ${fontConfig.printCss} !important;
            color: #000000 !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .keep-with-next, h3, h4 {
            break-after: avoid;
            page-break-after: avoid;
          }
        </style>
      </head>
      <body>
        <div class="bg-white text-black w-full text-left ${fontConfig.className} ${spacingClass}">
          ${cleanHtml}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.focus();
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
