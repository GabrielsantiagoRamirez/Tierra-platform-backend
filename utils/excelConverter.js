const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Obtiene el texto de una celda de forma segura, manejando todos los tipos de valores de ExcelJS
 * @param {Object} cell - Celda de ExcelJS
 * @returns {String} Texto de la celda o cadena vacía
 */
const getCellText = (cell) => {
   if (!cell) return '';
   
   try {
      // Intentar obtener el texto formateado (más confiable)
      if (cell.text != null && cell.text !== undefined) {
         const text = cell.text;
         // Si es un string, retornarlo directamente
         if (typeof text === 'string') {
            return text;
         }
         // Si es un número, convertirlo a string
         if (typeof text === 'number' || typeof text === 'boolean') {
            return String(text);
         }
         // Si es una fecha, formatearla
         if (text instanceof Date) {
            return text.toLocaleDateString();
         }
         // Para otros tipos, intentar convertir a string de forma segura
         if (text !== null && text !== undefined) {
            return String(text);
         }
      }
      
      // Si no hay texto, intentar con el valor
      if (cell.value != null && cell.value !== undefined) {
         const value = cell.value;
         // Si es un string, retornarlo directamente
         if (typeof value === 'string') {
            return value;
         }
         // Si es un número o booleano, convertirlo a string
         if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
         }
         // Si es una fecha, formatearla
         if (value instanceof Date) {
            return value.toLocaleDateString();
         }
         // Para objetos (como fórmulas), intentar usar el resultado si está disponible
         if (typeof value === 'object' && value !== null) {
            // Si hay un resultado calculado, usarlo
            if (cell.result !== null && cell.result !== undefined) {
               return getCellText({ value: cell.result });
            }
            // Si no, intentar convertir a string de forma segura
            try {
               return String(value);
            } catch (e) {
               return '';
            }
         }
      }
      
      return '';
   } catch (error) {
      // Si hay algún error al procesar la celda, retornar cadena vacía
      console.warn('⚠️  Error procesando celda:', error.message);
      return '';
   }
};


const convertExcelToPdf = async (excelFilePath, outputPdfPath) => {
   try {
      // Leer el archivo Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelFilePath);

      // Crear documento PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fsSync.createWriteStream(outputPdfPath);
      doc.pipe(stream);

      let isFirstSheet = true;

      // Procesar cada hoja del Excel
      workbook.eachSheet((worksheet, sheetId) => {
         if (!isFirstSheet) {
            doc.addPage();
         }
         isFirstSheet = false;

         // Título de la hoja (protegido contra null/undefined)
         const sheetName = worksheet.name || 'Hoja sin nombre';
         doc.fontSize(16)
            .font('Helvetica-Bold')
            .text(sheetName, { align: 'center' })
            .moveDown(0.5);

         // Configuración de columnas
         const columnWidths = {};
         let maxColumns = 0;

         // Primero, detectar el ancho necesario para cada columna
         worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
               if (!columnWidths[colNumber]) {
                  columnWidths[colNumber] = 0;
               }
               const cellText = getCellText(cell);
               const textWidth = cellText.length * 6; // Aproximado: 6 puntos por carácter
               if (textWidth > columnWidths[colNumber]) {
                  columnWidths[colNumber] = Math.min(textWidth, 100); // Máximo 100 puntos
               }
               if (colNumber > maxColumns) {
                  maxColumns = colNumber;
               }
            });
         });

         // Distribuir el ancho disponible entre las columnas
         const pageWidth = doc.page.width - 100; // Margen izquierdo y derecho
         const totalColumnWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
         const scaleFactor = totalColumnWidth > 0 ? pageWidth / totalColumnWidth : 1;

         // Ajustar ancho de columnas
         for (let col in columnWidths) {
            columnWidths[col] = columnWidths[col] * scaleFactor;
         }

         // Dibujar tabla
         let yPosition = doc.y;
         const rowHeight = 20;
         const headerHeight = 25;

         // Encabezados (primera fila)
         if (worksheet.getRow(1)) {
            let xPosition = 50;
            worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
               const cellText = getCellText(cell);
               const colWidth = columnWidths[colNumber] || 80;

               doc.fontSize(10)
                  .font('Helvetica-Bold')
                  .rect(xPosition, yPosition, colWidth, headerHeight)
                  .stroke()
                  .text(cellText, xPosition + 5, yPosition + 5, {
                     width: colWidth - 10,
                     height: headerHeight - 10,
                     align: 'left'
                  });

               xPosition += colWidth;
            });
            yPosition += headerHeight;
         }

         // Filas de datos
         let currentY = yPosition;
         const maxY = doc.page.height - 50; // Margen inferior

         worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            // Saltar la primera fila (ya se dibujó como encabezado)
            if (rowNumber === 1) return;

            // Si se acerca al final de la página, crear una nueva
            if (currentY + rowHeight > maxY) {
               doc.addPage();
               currentY = 50; // Margen superior
            }

            let xPosition = 50;

            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
               const cellText = getCellText(cell);
               const colWidth = columnWidths[colNumber] || 80;

               // Determinar estilo según el tipo de celda
               const isNumber = !isNaN(cellText) && cellText.trim() !== '';
               const fontSize = isNumber ? 9 : 9;

               doc.fontSize(fontSize)
                  .font('Helvetica')
                  .rect(xPosition, currentY, colWidth, rowHeight)
                  .stroke()
                  .text(cellText, xPosition + 5, currentY + 5, {
                     width: colWidth - 10,
                     height: rowHeight - 10,
                     align: isNumber ? 'right' : 'left'
                  });

               xPosition += colWidth;
            });

            currentY += rowHeight;
         });
      });

      // Finalizar PDF
      doc.end();

      // Esperar a que el stream termine de escribir
      await new Promise((resolve, reject) => {
         stream.on('finish', resolve);
         stream.on('error', reject);
      });

      return outputPdfPath;

   } catch (error) {
      console.error('❌ Error convirtiendo Excel a PDF:', error.message);
      throw new Error(`Error al convertir Excel a PDF: ${error.message}`);
   }
};

module.exports = {
   convertExcelToPdf
};
