The photo reader (js/engine/ocr.js), as shipped from the npm registry. Not edited, except
that the source-map comments are removed (the maps are not shipped).

  tesseract.js       tesseract.js 7.0.0, dist/tesseract.esm.min.js       Apache-2.0
  worker.js          tesseract.js 7.0.0, dist/worker.min.js              Apache-2.0
  tesseract-core-simd-lstm.wasm.js, tesseract-core-lstm.wasm.js
                     tesseract.js-core 7.0.0 (Tesseract OCR in WebAssembly) Apache-2.0
  eng.traineddata.gz, ara.traineddata.gz
                     @tesseract.js-data/eng and /ara 1.0.0, 4.0.0_best_int
                     (Tesseract's tessdata_best, integer build)            Apache-2.0

LICENSE-tesseract.js.txt is the Apache License 2.0 as shipped with tesseract.js. The
bundled third-party notices (regenerator-runtime, buffer, ieee754, zlib.js: MIT and
BSD-3-Clause) are kept in the files' own header comments.
