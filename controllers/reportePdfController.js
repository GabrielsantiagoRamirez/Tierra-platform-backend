const reportePdfService = require('../services/reportePdfService');

/**
 * Crea un nuevo reporte PDF para una obra
 */
const createReportePdf = async (req, res) => {
   try {
      const { obraId } = req.params;
      const { url, nombre, fecha_generacion, tamaño, version, clave, generatedBy } = req.body;

      // Validaciones
      if (!url) {
         return res.status(400).json({
            status: 'error',
            message: 'url is required'
         });
      }

      if (!nombre) {
         return res.status(400).json({
            status: 'error',
            message: 'nombre is required'
         });
      }

      if (!fecha_generacion) {
         return res.status(400).json({
            status: 'error',
            message: 'fecha_generacion is required'
         });
      }

      const reporteData = {
         url,
         nombre,
         fecha_generacion,
         tamaño: tamaño || null,
         version: version || 1,
         clave: clave || null,
         generatedBy: generatedBy || req.user?._id?.toString() || null
      };

      const reporte = await reportePdfService.createReportePdf(obraId, reporteData);

      return res.status(201).json({
         status: 'success',
         message: 'Reporte PDF creado exitosamente',
         reporte: reporte
      });

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      if (error.message === 'Obra not found') {
         return res.status(404).json({
            status: 'error',
            message: error.message
         });
      }

      if (error.message === 'Clave already exists' || error.message === 'Invalid fecha_generacion') {
         return res.status(400).json({
            status: 'error',
            message: error.message
         });
      }

      return res.status(500).json({
         status: 'error',
         message: 'Error creating reporte PDF',
         error: error.message
      });
   }
};

/**
 * Lista todos los reportes PDF de todas las obras
 */
const listAllReportes = async (req, res) => {
   try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reportePdfService.listAllReportes(page, limit);

      return res.status(200).json({
         status: 'success',
         data: result
      });

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      return res.status(500).json({
         status: 'error',
         message: 'Error listing all reportes PDF',
         error: error.message
      });
   }
};

/**
 * Lista todos los reportes PDF de una obra
 */
const listReportesByObra = async (req, res) => {
   try {
      const { obraId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reportePdfService.listReportesByObra(obraId, page, limit);

      return res.status(200).json({
         status: 'success',
         data: result
      });

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      if (error.message === 'Obra not found') {
         return res.status(404).json({
            status: 'error',
            message: error.message
         });
      }

      return res.status(500).json({
         status: 'error',
         message: 'Error listing reportes PDF',
         error: error.message
      });
   }
};

/**
 * Obtiene un reporte PDF por su ID
 */
const getReportePdfById = async (req, res) => {
   try {
      const { id } = req.params;

      const reporte = await reportePdfService.getReportePdfById(id);

      if (!reporte) {
         return res.status(404).json({
            status: 'error',
            message: 'Reporte PDF not found'
         });
      }

      return res.status(200).json({
         status: 'success',
         reporte: reporte
      });

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      return res.status(500).json({
         status: 'error',
         message: 'Error getting reporte PDF',
         error: error.message
      });
   }
};

/**
 * Obtiene un reporte PDF por su clave
 */
const getReportePdfByClave = async (req, res) => {
   try {
      const { clave } = req.params;

      const reporte = await reportePdfService.getReportePdfByClave(clave);

      if (!reporte) {
         return res.status(404).json({
            status: 'error',
            message: 'Reporte PDF not found'
         });
      }

      return res.status(200).json({
         status: 'success',
         reporte: reporte
      });

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      return res.status(500).json({
         status: 'error',
         message: 'Error getting reporte PDF',
         error: error.message
      });
   }
};

/**
 * Elimina un reporte PDF por su ID
 */
const deleteReportePdfById = async (req, res) => {
   try {
      const { id } = req.params;

      const reporte = await reportePdfService.deleteReportePdfById(id);

      if (!reporte) {
         return res.status(404).json({
            status: 'error',
            message: 'Reporte PDF not found'
         });
      }

      return res.status(200).json({
         status: 'success',
         message: 'Reporte PDF eliminado exitosamente',
         reporte: reporte
      });

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      return res.status(500).json({
         status: 'error',
         message: 'Error deleting reporte PDF',
         error: error.message
      });
   }
};

/**
 * Descarga un reporte PDF por su ID
 * Si la URL es de Cloudinary y está protegida, redirige directamente
 * Si no, intenta descargar y servir el PDF
 */
const downloadReportePdfById = async (req, res) => {
   try {
      const { id } = req.params;
      const { redirect } = req.query; // Parámetro opcional: ?redirect=true para solo redirigir

      // Obtener el reporte PDF
      const reporte = await reportePdfService.getReportePdfById(id);

      if (!reporte) {
         return res.status(404).json({
            status: 'error',
            message: 'Reporte PDF not found'
         });
      }

      // Si el parámetro redirect=true, simplemente redirigir a la URL
      if (redirect === 'true') {
         return res.redirect(302, reporte.url);
      }

      // Intentar descargar y servir el PDF
      try {
         const pdfBuffer = await reportePdfService.downloadPdfFromUrl(reporte.url);

         // Configurar headers para descarga de PDF
         const nombreArchivo = reporte.nombre || `reporte-${reporte.clave}.pdf`;
         
         // Codificar el nombre del archivo para headers HTTP (RFC 5987)
         // Los headers HTTP solo aceptan ASCII, así que codificamos caracteres no-ASCII
         const encodeRFC5987 = (str) => {
            return encodeURIComponent(str)
               .replace(/'/g, "%27")
               .replace(/\(/g, "%28")
               .replace(/\)/g, "%29");
         };
         
         // Usar filename* para soportar caracteres no-ASCII (UTF-8)
         const contentDisposition = `attachment; filename="${nombreArchivo.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeRFC5987(nombreArchivo)}`;
         
         res.setHeader('Content-Type', 'application/pdf');
         res.setHeader('Content-Disposition', contentDisposition);
         res.setHeader('Content-Length', pdfBuffer.length);

         // Enviar el PDF como respuesta
         return res.status(200).send(pdfBuffer);

      } catch (downloadError) {
         // Si falla la descarga (p.ej., 401 Unauthorized), redirigir directamente
         console.warn('⚠️  [REPORTE_PDF] Error descargando PDF, redirigiendo directamente:', downloadError.message);
         
         // Redirigir a la URL de Cloudinary
         return res.redirect(302, reporte.url);
      }

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      if (error.message.includes('not found')) {
         return res.status(404).json({
            status: 'error',
            message: error.message
         });
      }

      return res.status(500).json({
         status: 'error',
         message: 'Error downloading reporte PDF',
         error: error.message
      });
   }
};

/**
 * Elimina un reporte PDF por su clave
 */
const deleteReportePdfByClave = async (req, res) => {
   try {
      const { clave } = req.params;

      const reporte = await reportePdfService.deleteReportePdfByClave(clave);

      if (!reporte) {
         return res.status(404).json({
            status: 'error',
            message: 'Reporte PDF not found'
         });
      }

      return res.status(200).json({
         status: 'success',
         message: 'Reporte PDF eliminado exitosamente',
         reporte: reporte
      });

   } catch (error) {
      console.error('❌ [REPORTE_PDF] Error:', error.message);

      return res.status(500).json({
         status: 'error',
         message: 'Error deleting reporte PDF',
         error: error.message
      });
   }
};

module.exports = {
   createReportePdf,
   listAllReportes,
   listReportesByObra,
   getReportePdfById,
   getReportePdfByClave,
   downloadReportePdfById,
   deleteReportePdfById,
   deleteReportePdfByClave
};
