const geminiService = require('../services/geminiService');
const documentService = require('../services/documentService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const excelConverter = require('../utils/excelConverter');
const wordConverter = require('../utils/wordConverter');

// Configurar multer para almacenamiento temporal
const storage = multer.diskStorage({
   destination: async (req, file, cb) => {
      // Crear directorio temporal si no existe
      const tmpDir = path.join(os.tmpdir(), 'construction-docs');
      try {
         await fs.mkdir(tmpDir, { recursive: true });
         cb(null, tmpDir);
      } catch (error) {
         cb(error);
      }
   },
   filename: (req, file, cb) => {
      // Generar nombre único
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
   }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
   const allowedMimes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
   ];

   if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
   } else {
      cb(new Error('Tipo de archivo no permitido. Se permiten: PDF, imágenes (PNG, JPEG), Word, Excel'));
   }
};

const upload = multer({
   storage: storage,
   fileFilter: fileFilter,
   limits: {
      fileSize: 10 * 1024 * 1024 // 10MB máximo
   }
});

/**
 * Procesa un documento y extrae datos de obra y tareas usando Gemini
 */
const processDocument = async (req, res) => {
   const startTime = Date.now();

   if (!req.file) {
      return res.status(400).json({
         status: 'error',
         message: 'No se proporcionó ningún archivo. Use el campo "documento" para subir el archivo.'
      });
   }

   let tempFilePath = req.file.path;
   let convertedPdfPath = null;
   let fileToProcess = tempFilePath;
   let mimeTypeToSend = req.file.mimetype;

   try {
      console.log('📄 [DOCUMENT] Procesando documento:', req.file.originalname);
      console.log('📄 [DOCUMENT] Tipo:', req.file.mimetype);
      console.log('📄 [DOCUMENT] Tamaño:', req.file.size, 'bytes');

      // Detectar si es Excel o Word y convertirlo a PDF
      const isExcel = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     req.file.mimetype === 'application/vnd.ms-excel';
      const isWord = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    req.file.mimetype === 'application/msword';

      if (isExcel || isWord) {
         console.log(`🔄 [DOCUMENT] Convirtiendo ${isExcel ? 'Excel' : 'Word'} a PDF...`);
         
         // Generar ruta para el PDF convertido
         const pdfFileName = path.basename(tempFilePath, path.extname(tempFilePath)) + '.pdf';
         convertedPdfPath = path.join(path.dirname(tempFilePath), pdfFileName);

         if (isExcel) {
            await excelConverter.convertExcelToPdf(tempFilePath, convertedPdfPath);
         } else if (isWord) {
            await wordConverter.convertWordToPdf(tempFilePath, convertedPdfPath);
         }

         console.log('✅ [DOCUMENT] Conversión a PDF completada');
         
         // Usar el PDF convertido en lugar del archivo original
         fileToProcess = convertedPdfPath;
         mimeTypeToSend = 'application/pdf';
      }

      // Determinar el modelo a usar (por defecto gemini-2.5-flash)
      const modelName = req.body.model || 'gemini-2.5-flash';

      // Procesar el documento con Gemini usando File API
      // Ahora siempre enviaremos PDF si era Excel/Word, o el archivo original si ya era PDF/imagen
      const extractedData = await geminiService.processDocument(
         fileToProcess,
         mimeTypeToSend,
         modelName
      );

      console.log('✅ [DOCUMENT] Documento procesado en', Date.now() - startTime, 'ms');

      // Guardar automáticamente en la base de datos
      const obraCreada = await documentService.saveProcessedDocument(extractedData);
      console.log('✅ [DOCUMENT] Datos guardados en la base de datos');

      // Limpiar archivos temporales
      try {
         await fs.unlink(tempFilePath);
         if (convertedPdfPath) {
            await fs.unlink(convertedPdfPath);
         }
      } catch (cleanupError) {
         console.warn('⚠️  No se pudo eliminar archivo temporal:', cleanupError.message);
      }

      return res.status(201).json({
         status: 'success',
         message: 'Documento procesado y guardado exitosamente',
         obra: obraCreada,
         processing_time_ms: Date.now() - startTime
      });

   } catch (error) {
      console.error('❌ [DOCUMENT] Error:', error.message);
      console.error('❌ [DOCUMENT] Stack:', error.stack);

      // Limpiar archivos temporales en caso de error
      try {
         await fs.unlink(tempFilePath);
         if (convertedPdfPath) {
            await fs.unlink(convertedPdfPath);
         }
      } catch (cleanupError) {
         console.warn('⚠️  No se pudo eliminar archivo temporal:', cleanupError.message);
      }

      // Errores específicos
      if (error.message.includes('GEMINI_API_KEY')) {
         return res.status(500).json({
            status: 'error',
            message: 'Error de configuración: GEMINI_API_KEY no está configurada',
            error: error.message
         });
      }

      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Quota exceeded')) {
         return res.status(429).json({
            status: 'error',
            message: 'Cuota de API excedida. Opciones: 1) Habilitar facturación en Google Cloud, 2) Esperar a que se restablezca el límite, 3) Usar un modelo diferente',
            error: 'Quota exceeded',
            suggestion: 'Visita https://console.cloud.google.com/ para habilitar facturación y aumentar los límites'
         });
      }

      if (error.message.includes('JSON')) {
         return res.status(500).json({
            status: 'error',
            message: 'Error procesando la respuesta de Gemini',
            error: error.message
         });
      }

      // Errores relacionados con guardado en BD
      if (error.message.includes('Datos incompletos') || error.message.includes('Debe haber')) {
         return res.status(400).json({
            status: 'error',
            message: error.message,
            error: error.message
         });
      }

      if (error.message.includes('must have at least one tarea') || error.message.includes('One or more tareas do not exist')) {
         return res.status(400).json({
            status: 'error',
            message: 'Error al guardar datos: ' + error.message,
            error: error.message
         });
      }

      return res.status(500).json({
         status: 'error',
         message: 'Error procesando documento',
         error: error.message
      });
   }
};

/**
 * Guarda los datos procesados del documento en la base de datos
 * NOTA: Esta función ya no se usa, el guardado se hace automáticamente en processDocument
 */
// const saveDocument = async (req, res) => {
//    try {
//       const { obra, tareas } = req.body;

//       if (!obra || !tareas) {
//          return res.status(400).json({
//             status: 'error',
//             message: 'Datos incompletos: se requiere obra y tareas'
//          });
//       }

//       if (!Array.isArray(tareas) || tareas.length === 0) {
//          return res.status(400).json({
//             status: 'error',
//             message: 'Debe haber al menos una tarea'
//          });
//       }

//       // Guardar los datos procesados
//       const obraCreada = await documentService.saveProcessedDocument({
//          obra,
//          tareas
//       });

//       return res.status(201).json({
//          status: 'success',
//          message: 'Documento guardado exitosamente en la base de datos',
//          obra: obraCreada
//       });

//    } catch (error) {
//       console.error('❌ [DOCUMENT] Error guardando documento:', error.message);
//       console.error('❌ [DOCUMENT] Stack:', error.stack);

//       // Errores específicos
//       if (error.message.includes('Datos incompletos') || error.message.includes('Debe haber')) {
//          return res.status(400).json({
//             status: 'error',
//             message: error.message,
//             error: error.message
//          });
//       }

//       if (error.message.includes('must have at least one tarea')) {
//          return res.status(400).json({
//             status: 'error',
//             message: 'Debe haber al menos una tarea',
//             error: error.message
//          });
//       }

//       return res.status(500).json({
//          status: 'error',
//          message: 'Error guardando documento en la base de datos',
//          error: error.message
//       });
//    }
// };

module.exports = {
   processDocument,
   // saveDocument, // Ya no se usa, el guardado se hace automáticamente en processDocument
   upload
};
