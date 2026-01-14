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

      // Crear documento PDF en orientación horizontal para más espacio
      const doc = new PDFDocument({ 
         margin: 40, 
         size: [842, 595], // A4 landscape (ancho x alto)
         layout: 'landscape'
      });
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
         // Identificar qué columna es ACTIVIDAD (generalmente columna 2)
         let actividadColumn = null;
         worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
               if (!columnWidths[colNumber]) {
                  columnWidths[colNumber] = 0;
               }
               const cellText = getCellText(cell);
               
               // Detectar columna de ACTIVIDAD (buscar encabezado que contenga "ACTIVIDAD" o "ACTIVIDA")
               if (rowNumber === 1 && (cellText.toUpperCase().includes('ACTIVIDAD') || cellText.toUpperCase().includes('ACTIVIDA'))) {
                  actividadColumn = colNumber;
               }
               
               // Calcular ancho necesario para el texto
               // Usar fuente más pequeña para cálculo (7pt para ACTIVIDAD, 8pt para otras)
               const testFontSize = colNumber === actividadColumn ? 7 : 8;
               const charsPerPoint = testFontSize * 0.6; // Aproximación: 0.6 caracteres por punto
               const textWidth = cellText.length / charsPerPoint;
               
               // Si es la columna de ACTIVIDAD, darle mucho más espacio
               if (colNumber === actividadColumn) {
                  // Mínimo 250 puntos, máximo 500 puntos para ACTIVIDAD
                  columnWidths[colNumber] = Math.max(columnWidths[colNumber], Math.min(textWidth, 500));
                  // Asegurar mínimo de 250 puntos
                  if (columnWidths[colNumber] < 250) {
                     columnWidths[colNumber] = 250;
                  }
               } else {
                  // Para otras columnas, máximo 150 puntos
                  columnWidths[colNumber] = Math.max(columnWidths[colNumber], Math.min(textWidth, 150));
               }
               
               if (colNumber > maxColumns) {
                  maxColumns = colNumber;
               }
            });
         });

         // Distribuir el ancho disponible entre las columnas
         const pageWidth = doc.page.width - 80; // Margen izquierdo y derecho (reducido para más espacio)
         const totalColumnWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
         
         // Si la columna de ACTIVIDAD existe, darle prioridad (50% del ancho disponible en landscape)
         if (actividadColumn !== null && columnWidths[actividadColumn]) {
            const actividadMinWidth = pageWidth * 0.5; // 50% del ancho de página (más espacio en landscape)
            const otherColumnsWidth = Object.keys(columnWidths).reduce((sum, col) => {
               return sum + (parseInt(col) === actividadColumn ? 0 : columnWidths[col]);
            }, 0);
            
            // Asegurar que ACTIVIDAD tenga al menos el mínimo
            if (columnWidths[actividadColumn] < actividadMinWidth) {
               columnWidths[actividadColumn] = actividadMinWidth;
            }
            
            // Distribuir el resto del espacio entre otras columnas
            const remainingWidth = pageWidth - columnWidths[actividadColumn];
            if (otherColumnsWidth > 0 && remainingWidth > 0) {
               const scaleFactor = remainingWidth / otherColumnsWidth;
               for (let col in columnWidths) {
                  if (parseInt(col) !== actividadColumn) {
                     columnWidths[col] = columnWidths[col] * scaleFactor;
                  }
               }
            }
         } else {
            // Si no hay columna ACTIVIDAD, distribuir proporcionalmente
            const scaleFactor = totalColumnWidth > 0 ? pageWidth / totalColumnWidth : 1;
            for (let col in columnWidths) {
               columnWidths[col] = columnWidths[col] * scaleFactor;
            }
         }

         // Dibujar tabla
         let yPosition = doc.y;
         const baseRowHeight = 20; // Altura base mínima
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
         const maxY = doc.page.height - 40; // Margen inferior

         worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            // Saltar la primera fila (ya se dibujó como encabezado)
            if (rowNumber === 1) return;

            // PRIMERO: Calcular la altura necesaria para TODA la fila ANTES de dibujar
            let maxRowHeight = baseRowHeight;
            const cellTexts = {};
            const cellStyles = {};
            
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
               const cellText = getCellText(cell);
               cellTexts[colNumber] = cellText;
               
               const colWidth = columnWidths[colNumber] || 80;
               const isNumber = !isNaN(cellText) && cellText.trim() !== '';
               const isActividadColumn = colNumber === actividadColumn;
               const finalFontSize = isActividadColumn ? 7 : (isNumber ? 9 : 8);
               
               cellStyles[colNumber] = {
                  fontSize: finalFontSize,
                  isNumber: isNumber,
                  colWidth: colWidth
               };
               
               // Calcular altura necesaria para esta celda
               doc.fontSize(finalFontSize);
               const textOptions = {
                  width: colWidth - 10,
                  align: isNumber ? 'right' : 'left',
                  ellipsis: false
               };
               
               const estimatedHeight = doc.heightOfString(cellText, textOptions);
               const neededHeight = estimatedHeight + 10; // +10 para padding
               if (neededHeight > maxRowHeight) {
                  maxRowHeight = neededHeight;
               }
            });

            // Verificar si necesitamos nueva página
            if (currentY + maxRowHeight > maxY) {
               doc.addPage();
               currentY = 40; // Margen superior
            }

            // SEGUNDO: Dibujar todas las celdas de la fila con la misma altura
            let xPosition = 40;

            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
               const cellText = cellTexts[colNumber];
               const style = cellStyles[colNumber];
               const colWidth = style.colWidth;

               doc.fontSize(style.fontSize)
                  .font('Helvetica')
                  .rect(xPosition, currentY, colWidth, maxRowHeight)
                  .stroke();
               
               const textOptions = {
                  width: colWidth - 10,
                  height: maxRowHeight - 10,
                  align: style.isNumber ? 'right' : 'left',
                  ellipsis: false // NO truncar con "..."
               };
               
               doc.text(cellText, xPosition + 5, currentY + 5, textOptions);

               xPosition += colWidth;
            });

            // Incrementar Y usando la altura real de la fila
            currentY += maxRowHeight;
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
