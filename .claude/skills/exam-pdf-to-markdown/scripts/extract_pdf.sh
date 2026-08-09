#!/bin/bash
# Extract text from an exam PDF, preserving layout when possible.
# Usage: extract_pdf.sh <input.pdf> <output.txt>
# Prefers pdftotext -layout (poppler). Falls back to macOS PDFKit via JXA,
# which loses column layout — the caller must then rely on stricter
# cross-validation against the answers file.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <input.pdf> <output.txt>" >&2
  exit 1
fi

IN="$1"
OUT="$2"

if command -v pdftotext >/dev/null 2>&1; then
  pdftotext -layout "$IN" "$OUT"
  echo "extracted with pdftotext -layout: $OUT"
else
  echo "WARNING: pdftotext not found, falling back to PDFKit (layout will be scrambled)" >&2
  osascript -l JavaScript -e '
    ObjC.import("PDFKit");
    function run(argv) {
      var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
      var parts = [];
      for (var i = 0; i < doc.pageCount; i++) {
        parts.push(doc.pageAtIndex(i).string.js);
      }
      var text = $(parts.join("\n\f\n"));
      text.writeToFileAtomicallyEncodingError(argv[1], true, $.NSUTF8StringEncoding, null);
      return "extracted with PDFKit: " + argv[1];
    }' "$IN" "$OUT"
fi
