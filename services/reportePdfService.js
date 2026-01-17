const ReportePdf = require('../models/ReportePdf');
const Obra = require('../models/Obra');

/**
 * Genera una clave única para el reporte PDF
 * Formato: reporte-{obraId}-{timestamp}
 * @param {String} obraId - ID de la obra
 * @returns {String} Clave única generada
 */
const generateClave = (obraId) => {
   const timestamp = Date.now();
   return `reporte-${obraId}-${timestamp}`;
};

/**
 * Crea un nuevo reporte PDF para una obra
 * @param {String} obraId - ID de la obra
 * @param {Object} reporteData - Datos del reporte PDF
 * @param {String} reporteData.url - URL del PDF
 * @param {String} reporteData.nombre - Nombre del archivo PDF
 * @param {Date|String} reporteData.fecha_generacion - Fecha de generación
 * @param {Number} reporteData.tamaño - Tamaño en bytes (opcional)
 * @param {Number} reporteData.version - Versión (opcional, default: 1)
 * @param {String} reporteData.clave - Clave personalizada (opcional)
 * @param {String} reporteData.generatedBy - ID del usuario que generó (opcional)
 * @returns {Promise<Object>} Reporte PDF creado
 */
const createReportePdf = async (obraId, reporteData) => {
   // Validar que la obra exista
   const obra = await Obra.findById(obraId);
   if (!obra) {
      throw new Error('Obra not found');
   }

   // Generar clave si no se proporciona
   const clave = reporteData.clave || generateClave(obraId);

   // Verificar que la clave no exista (en caso de que se proporcione)
   const existingReporte = await ReportePdf.findOne({ clave });
   if (existingReporte) {
      throw new Error('Clave already exists. Please use a different clave or let the system generate one.');
   }

   // Parsear fecha_generacion si viene como string
   let fechaGeneracion = reporteData.fecha_generacion;
   if (typeof fechaGeneracion === 'string') {
      fechaGeneracion = new Date(fechaGeneracion);
   }

   // Validar que fecha_generacion sea válida
   if (!fechaGeneracion || isNaN(fechaGeneracion.getTime())) {
      throw new Error('Invalid fecha_generacion');
   }

   // Crear reporte PDF
   const nuevoReporte = new ReportePdf({
      obraId: obraId,
      clave: clave,
      url: reporteData.url,
      nombre: reporteData.nombre,
      fecha_generacion: fechaGeneracion,
      tamaño: reporteData.tamaño || null,
      version: reporteData.version || 1,
      generatedBy: reporteData.generatedBy || null
   });

   await nuevoReporte.save();

   // Actualizar updatedAt de la obra
   obra.updatedAt = new Date();
   await obra.save();

   return nuevoReporte;
};

/**
 * Lista todos los reportes PDF de una obra
 * @param {String} obraId - ID de la obra
 * @param {Number} page - Página (opcional, default: 1)
 * @param {Number} limit - Límite por página (opcional, default: 10)
 * @returns {Promise<Object>} Lista paginada de reportes
 */
const listReportesByObra = async (obraId, page = 1, limit = 10) => {
   // Validar que la obra exista
   const obra = await Obra.findById(obraId);
   if (!obra) {
      throw new Error('Obra not found');
   }

   const result = await ReportePdf.paginate(
      { obraId: obraId },
      {
         page,
         limit,
         sort: { createdAt: -1 }, // Más recientes primero
         populate: 'generatedBy'
      }
   );

   return result;
};

/**
 * Obtiene un reporte PDF por su ID
 * @param {String} id - ID del reporte PDF
 * @returns {Promise<Object|null>} Reporte PDF encontrado o null
 */
const getReportePdfById = async (id) => {
   const reporte = await ReportePdf.findById(id).populate('generatedBy').populate('obraId');
   return reporte;
};

/**
 * Obtiene un reporte PDF por su clave
 * @param {String} clave - Clave del reporte PDF
 * @returns {Promise<Object|null>} Reporte PDF encontrado o null
 */
const getReportePdfByClave = async (clave) => {
   const reporte = await ReportePdf.findOne({ clave }).populate('generatedBy').populate('obraId');
   return reporte;
};

/**
 * Elimina un reporte PDF por su ID
 * @param {String} id - ID del reporte PDF
 * @returns {Promise<Object|null>} Reporte PDF eliminado o null
 */
const deleteReportePdfById = async (id) => {
   const reporte = await ReportePdf.findById(id);
   
   if (!reporte) {
      return null;
   }

   // Actualizar updatedAt de la obra antes de eliminar
   const obra = await Obra.findById(reporte.obraId);
   if (obra) {
      obra.updatedAt = new Date();
      await obra.save();
   }

   await ReportePdf.findByIdAndDelete(id);
   return reporte;
};

/**
 * Elimina un reporte PDF por su clave
 * @param {String} clave - Clave del reporte PDF
 * @returns {Promise<Object|null>} Reporte PDF eliminado o null
 */
const deleteReportePdfByClave = async (clave) => {
   const reporte = await ReportePdf.findOne({ clave });
   
   if (!reporte) {
      return null;
   }

   // Actualizar updatedAt de la obra antes de eliminar
   const obra = await Obra.findById(reporte.obraId);
   if (obra) {
      obra.updatedAt = new Date();
      await obra.save();
   }

   await ReportePdf.findOneAndDelete({ clave });
   return reporte;
};

module.exports = {
   createReportePdf,
   listReportesByObra,
   getReportePdfById,
   getReportePdfByClave,
   deleteReportePdfById,
   deleteReportePdfByClave,
   generateClave
};
