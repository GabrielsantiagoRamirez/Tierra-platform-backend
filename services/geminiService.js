const { GoogleGenAI, createUserContent, createPartFromUri } = require('@google/genai');
const fs = require('fs').promises;

// Inicializar Gemini API
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
   console.warn('⚠️  GEMINI_API_KEY no está configurada en las variables de entorno');
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/**
 * Filtra las tareas para incluir solo las que tienen todos los campos requeridos
 * @param {Array} tareas - Array de tareas a filtrar
 * @returns {Array} Array de tareas filtradas con todos los campos requeridos
 */
const filterCompleteTasks = (tareas) => {
   if (!Array.isArray(tareas)) {
      return [];
   }

   return tareas.filter(tarea => {
      // Verificar que todos los campos requeridos estén presentes y no sean null
      if (!tarea) return false;
      
      // Verificar que item tenga decimales (no solo números enteros como "1.00" que son categorías)
      const itemStr = String(tarea.item || '');
      if (!itemStr.includes('.') || itemStr.endsWith('.00')) {
         return false; // Es una categoría, no una actividad real
      }
      
      // Verificar que actividad tenga texto válido (no vacío, no solo espacios)
      if (!tarea.actividad || typeof tarea.actividad !== 'string' || tarea.actividad.trim().length === 0) {
         return false;
      }
      
      // Verificar que unidad tenga valor
      if (!tarea.unidad || typeof tarea.unidad !== 'string' || tarea.unidad.trim().length === 0) {
         return false;
      }
      
      // Verificar que cantidad sea un número mayor a 0
      const cantidad = typeof tarea.cantidad === 'number' ? tarea.cantidad : parseFloat(tarea.cantidad);
      if (isNaN(cantidad) || cantidad <= 0) {
         return false;
      }
      
      // Verificar que precio_unitario sea un número mayor a 0
      const precioUnitario = typeof tarea.precio_unitario === 'number' ? tarea.precio_unitario : parseFloat(tarea.precio_unitario);
      if (isNaN(precioUnitario) || precioUnitario <= 0) {
         return false;
      }
      
      // Verificar que precio_total sea un número mayor a 0
      const precioTotal = typeof tarea.precio_total === 'number' ? tarea.precio_total : parseFloat(tarea.precio_total);
      if (isNaN(precioTotal) || precioTotal <= 0) {
         return false;
      }
      
      return true;
   });
};


const processDocument = async (filePath, mimeType, modelName = 'gemini-2.5-flash') => {
   if (!ai) {
      throw new Error('GEMINI_API_KEY no está configurada');
   }

   let uploadedFile = null;

   try {
      // Subir el archivo usando File API
      uploadedFile = await ai.files.upload({
         file: filePath,
         config: { mimeType: mimeType },
      });

      console.log('✅ [GEMINI] Archivo subido:', uploadedFile.name);

      // Prompt estructurado para extraer datos
      const prompt = `Eres un extractor determinístico de presupuestos de construcción desde un archivo Excel/PDF.

OBJETIVO:
Devolver ÚNICAMENTE un JSON válido (sin markdown, sin texto extra) con esta estructura exacta:

{
  "obra": {
    "cotizacion": "...",
    "fecha": "...",
    "cliente": "...",
    "proyecto": "...",
    "empresa": "...",
    "nit": "...",
    "emails": []
  },
  "tareas": [
    {
      "item": "1.01",
      "actividad": "texto EXACTO y COMPLETO de la celda ACTIVIDAD",
      "unidad": "ML",
      "cantidad": 7,
      "precio_unitario": 11550,
      "precio_total": 80850,
      "categoria": "texto COMPLETO de la categoría",
      "name_sugerido": "titulo corto sin perder significado",
      "actividad_raw_len": 0
    }
  ]
}

REGLA MÁS IMPORTANTE (OBLIGATORIA - CRÍTICA):
- Cuando leas la celda de la columna "ACTIVIDAD", DEBES extraer TODO el texto COMPLETO desde el primer carácter hasta el último.
- ⚠️ ATENCIÓN: Si el PDF muestra texto truncado visualmente (ej: "Retiro de e" en lugar de "Retiro de escombros"), 
  DEBES usar tu capacidad de lectura de documentos para extraer el TEXTO COMPLETO ORIGINAL de la celda.
- NO te bases solo en lo que ves visualmente truncado. LEE el contenido completo del documento.
- NO recortes, NO resumas, NO uses solo la primera palabra, NO elimines nada.
- Si la celda trae varias líneas, únelas en UNA SOLA LÍNEA conservando todas las palabras (reemplaza saltos de línea por un espacio).
- Si el texto parece cortado, intenta leer el contenido completo usando OCR o análisis profundo del documento.

REGLAS CRÍTICAS:
1) SOLO incluir filas donde el ITEM tenga decimales (ej: 1.01, 1.02, 2.01). 
   - NO incluir 1.00, 2.00, 3.00 (son categorías).
2) NO incluir subtotales, totales, filas vacías o incompletas.
   - ⚠️ ESPECÍFICAMENTE: NO incluir ninguna fila que contenga "SUBTOTAL" en la columna ACTIVIDAD o en cualquier parte de la fila.
   - Si una fila tiene "SUBTOTAL" en cualquier campo, OMÍTELA completamente.
3) Cada tarea DEBE tener: item decimal, actividad completa, unidad, cantidad > 0, precio_unitario > 0, precio_total > 0, categoria completa.
4) Precios:
   - Devolver como números (sin $), sin puntos de miles, sin espacios.
   - Ej: "$ 1.041.667" => 1041667
5) CATEGORÍA:
   - Debes mantener una "categoria_actual" que se actualiza SOLO cuando encuentras una fila categoría (item X.00).
   - Para cada fila de actividad (item decimal), asigna esa categoria_actual COMPLETA, sin truncar.
6) VALIDACIÓN OBLIGATORIA:
   - Para cada tarea calcula actividad_raw_len = número de caracteres de "actividad".
   - Si actividad_raw_len < 10, es muy probable que esté truncada. En ese caso, intenta leer el texto completo del documento original.
   - Si después de intentar leer el texto completo, actividad_raw_len sigue siendo < 10, NO la incluyas (mejor omitir que truncar).
7) name_sugerido:
   - No puede ser solo la primera palabra.
   - Debe ser una versión corta de la actividad, máximo 60 caracteres, pero conservando el sentido.
   - Ej: "Suministro e instalación de rejilla ventilación baño (Cambio)" => "Rejilla ventilación baño (cambio)"
   - Ej: "Afinado de nivelación para pisos 1:3 e=4cms" => "Afinado nivelación pisos e=4cms"
   - Si no puedes resumir sin perder información, usa la actividad completa como name_sugerido.
8) OUTPUT:
   - Devuelve SOLO JSON válido. Sin comentarios. Sin markdown. Sin texto adicional.

EXTRACCIÓN DE DATOS DE OBRA:
- Busca en encabezados: cotización/número, fecha, cliente, proyecto, empresa, NIT, emails.
- Si un campo no existe, usar null (excepto emails que debe ser []).

IMPORTANTE:
- Si el documento contiene un título como "COT-0003_202 - CENTRIK PARK", úsalo como obra.cotizacion o proyecto según corresponda, pero NO inventes datos.
- No adivines NIT o emails; solo si aparecen.
`;

      // Generar contenido usando el archivo subido
      const result = await ai.models.generateContent({
         model: modelName,
         contents: createUserContent([
            createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
            prompt,
         ]),
         generationConfig: {
            responseMimeType: 'application/json',
         },
      });

      // Parsear JSON de la respuesta
      let extractedData;
      try {
         // El nuevo SDK devuelve el texto directamente
         const text = result.text;
         extractedData = JSON.parse(text);
      } catch (parseError) {
         // Si hay código markdown alrededor, intentar extraer el JSON
         const text = result.text;
         const jsonMatch = text.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
            extractedData = JSON.parse(jsonMatch[0]);
         } else {
            throw new Error('No se pudo extraer JSON de la respuesta');
         }
      }

      // Logging: Ver qué devuelve Gemini antes del filtro
      if (extractedData && extractedData.tareas && Array.isArray(extractedData.tareas) && extractedData.tareas.length > 0) {
         console.log('📝 [GEMINI] === DEBUG: Datos recibidos de Gemini ===');
         console.log(`📝 [GEMINI] Total de tareas recibidas: ${extractedData.tareas.length}`);
         // Mostrar las primeras 3 tareas para debug
         for (let i = 0; i < Math.min(3, extractedData.tareas.length); i++) {
            const tarea = extractedData.tareas[i];
            console.log(`\n📝 [GEMINI] Tarea ${i + 1}:`);
            console.log('  - item:', tarea.item);
            console.log('  - actividad:', JSON.stringify(tarea.actividad));
            console.log('  - Longitud actividad:', tarea.actividad?.length || 0);
            console.log('  - categoria:', JSON.stringify(tarea.categoria));
            console.log('  - Longitud categoria:', tarea.categoria?.length || 0);
         }
         console.log('📝 [GEMINI] === FIN DEBUG ===\n');
      }

      // Filtrar tareas para incluir solo las que tienen todos los campos requeridos
      if (extractedData && extractedData.tareas && Array.isArray(extractedData.tareas)) {
         const originalCount = extractedData.tareas.length;
         extractedData.tareas = filterCompleteTasks(extractedData.tareas);
         const filteredCount = extractedData.tareas.length;
         
         if (originalCount !== filteredCount) {
            console.log(`📊 [GEMINI] Tareas filtradas: ${originalCount} -> ${filteredCount} (${originalCount - filteredCount} eliminadas por datos incompletos)`);
         }
      }

      return extractedData;

   } catch (error) {
      console.error('❌ Error procesando documento con Gemini:', error.message);
      throw error;
   } finally {
      // Limpiar el archivo subido si existe
      if (uploadedFile && uploadedFile.name) {
         try {
            await ai.files.delete({ name: uploadedFile.name });
         } catch (deleteError) {
            console.warn('⚠️  No se pudo eliminar archivo de Gemini:', deleteError.message);
         }
      }
   }
};

module.exports = {
   processDocument
};
