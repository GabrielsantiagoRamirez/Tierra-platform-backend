const mammoth = require('mammoth');
const htmlPdf = require('html-pdf-node');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Convierte un archivo Word (.docx, .doc) a PDF
 * @param {String} wordFilePath - Ruta del archivo Word
 * @param {String} outputPdfPath - Ruta donde guardar el PDF
 * @returns {Promise<String>} Ruta del archivo PDF generado
 */
const convertWordToPdf = async (wordFilePath, outputPdfPath) => {
   try {
      // Leer el archivo Word
      const wordBuffer = await fs.readFile(wordFilePath);

      // Convertir DOCX a HTML usando Mammoth
      const { value: htmlContent } = await mammoth.convertToHtml({ buffer: wordBuffer });

      // Agregar estilos básicos para mejorar la presentación
      const styledHtml = `
         <!DOCTYPE html>
         <html>
         <head>
            <meta charset="UTF-8">
            <style>
               body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  line-height: 1.6;
               }
               table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 10px 0;
               }
               table td, table th {
                  border: 1px solid #ddd;
                  padding: 8px;
               }
               table th {
                  background-color: #f2f2f2;
                  font-weight: bold;
               }
            </style>
         </head>
         <body>
            ${htmlContent}
         </body>
         </html>
      `;

      // Convertir HTML a PDF usando html-pdf-node
      const pdfBuffer = await htmlPdf.generatePdf(
         { content: styledHtml },
         { format: 'A4', margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } }
      );

      // Escribir el PDF al archivo
      await fs.writeFile(outputPdfPath, pdfBuffer);

      return outputPdfPath;

   } catch (error) {
      console.error('❌ Error convirtiendo Word a PDF:', error.message);
      throw new Error(`Error al convertir Word a PDF: ${error.message}`);
   }
};

module.exports = {
   convertWordToPdf
};
