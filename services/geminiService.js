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
      return tarea &&
         tarea.item != null &&
         tarea.actividad != null &&
         tarea.unidad != null &&
         tarea.cantidad != null &&
         tarea.precio_unitario != null &&
         tarea.precio_total != null;
   });
};

/**
 * Procesa un documento (PDF, imagen, Excel, Word) y extrae datos de obra y tareas
 * @param {String} filePath - Ruta del archivo a procesar
 * @param {String} mimeType - Tipo MIME del archivo
 * @param {String} modelName - Nombre del modelo a usar (por defecto 'gemini-2.5-flash')
 * @returns {Promise<Object>} JSON con datos de obra y tareas
 */
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
      const prompt = `Eres un experto en análisis de presupuestos de construcción. 

Analiza este documento y extrae la siguiente información en formato JSON:

1. **Datos de la Obra:**
   - cotizacion (número de cotización)
   - fecha (fecha del presupuesto)
   - cliente (nombre del cliente)
   - proyecto (nombre del proyecto)
   - empresa (nombre de la empresa)
   - nit (NIT de la empresa, si está disponible)
   - emails (array de emails de contacto, si están disponibles)

2. **Lista de Tareas:**
   - item (número de item)
   - actividad (descripción de la tarea/actividad)
   - unidad (unidad de medida: ML, M2, UN, VJ, etc.)
   - cantidad (cantidad numérica)
   - precio_unitario (precio por unidad)
   - precio_total (precio total: cantidad * precio_unitario)
   - categoria (categoría si está agrupada, ej: "PRELIMINARES", "MAMPOSTERIA", etc.)

IMPORTANTE:
- Extrae TODOS los items de la tabla
- Si hay subtotales o categorías, inclúyelos en el campo categoria
- Los precios deben ser números, sin símbolos de moneda
- Si un campo no está disponible, usa null
- Devuelve el JSON con esta estructura exacta:

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
      "item": "1.00",
      "actividad": "...",
      "unidad": "...",
      "cantidad": 0,
      "precio_unitario": 0,
      "precio_total": 0,
      "categoria": "..."
    }
  ]
}`;

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
