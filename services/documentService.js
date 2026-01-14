const Tarea = require('../models/Tarea.js').Model;
const ObraTarea = require('../models/ObraTarea.js');
const obraService = require('./obraService');

/**
 * Parsea una fecha string a Date
 * @param {String} fechaString - String de fecha a parsear
 * @returns {Date|null} Date parseada o null si no se puede parsear
 */
const parseFecha = (fechaString) => {
   if (!fechaString) return null;
   
   try {
      const fecha = new Date(fechaString);
      // Verificar si la fecha es válida
      if (isNaN(fecha.getTime())) {
         return null;
      }
      return fecha;
   } catch (error) {
      return null;
   }
};

/**
 * Calcula el costo total sumando todos los precio_total de las tareas
 * @param {Array} tareas - Array de tareas con precio_total
 * @returns {Number} Suma total de precios
 */
const calculateCostoTotal = (tareas) => {
   if (!Array.isArray(tareas) || tareas.length === 0) {
      return 0;
   }
   
   return tareas.reduce((sum, tarea) => {
      const precio = tarea.precio_total || 0;
      return sum + precio;
   }, 0);
};

/**
 * Transforma los datos de una tarea extraída del documento al formato de la BD
 * @param {Object} tareaData - Datos de tarea extraídos del documento
 * @returns {Object} Datos de tarea transformados para la BD
 */
const transformTareaData = (tareaData) => {
   if (!tareaData || !tareaData.actividad) {
      throw new Error('Tarea debe tener actividad');
   }
   
   // Concatenar item, unidad, cantidad, categoria en description
   const descriptionParts = [];
   if (tareaData.item != null) descriptionParts.push(`Item: ${tareaData.item}`);
   if (tareaData.unidad != null) descriptionParts.push(`Unidad: ${tareaData.unidad}`);
   if (tareaData.cantidad != null) descriptionParts.push(`Cantidad: ${tareaData.cantidad}`);
   if (tareaData.categoria != null) descriptionParts.push(`Categoría: ${tareaData.categoria}`);
   
   const description = descriptionParts.length > 0 ? descriptionParts.join(' | ') : null;
   
   return {
      name: tareaData.actividad,
      description: description,
      state: 'pendiente',
      evidences: []
   };
};

/**
 * Transforma los datos de obra extraídos del documento al formato de la BD
 * @param {Object} obraData - Datos de obra extraídos del documento
 * @param {Array} tareasData - Array de tareas extraídas (para calcular costos)
 * @returns {Object} Datos de obra transformados para la BD
 */
const transformObraData = (obraData, tareasData) => {
   if (!obraData) {
      throw new Error('Datos de obra requeridos');
   }
   
   // Construir title: "COT-{cotizacion} - {proyecto}"
   let title = '';
   if (obraData.cotizacion) {
      title = `COT-${obraData.cotizacion}`;
   }
   if (obraData.proyecto) {
      title = title ? `${title} - ${obraData.proyecto}` : obraData.proyecto;
   }
   if (!title) {
      title = 'Obra sin título';
   }
   
   // Construir description: concatenar cliente, empresa, nit, emails
   const descriptionParts = [];
   if (obraData.cliente) descriptionParts.push(`Cliente: ${obraData.cliente}`);
   if (obraData.empresa) descriptionParts.push(`Empresa: ${obraData.empresa}`);
   if (obraData.nit) descriptionParts.push(`NIT: ${obraData.nit}`);
   if (obraData.emails && Array.isArray(obraData.emails) && obraData.emails.length > 0) {
      descriptionParts.push(`Emails: ${obraData.emails.join(', ')}`);
   }
   const description = descriptionParts.length > 0 ? descriptionParts.join(' | ') : null;
   
   // Parsear fecha
   const fechaInicio = parseFecha(obraData.fecha);
   
   // Calcular costos
   const costoTotal = calculateCostoTotal(tareasData);
   
   return {
      title: title,
      description: description,
      fechaInicio: fechaInicio,
      costo: costoTotal,
      costoEstimado: costoTotal,
      costoFinal: costoTotal,
      estado: 'pendiente'
   };
};

/**
 * Guarda los datos procesados del documento en la base de datos
 * @param {Object} extractedData - Datos extraídos del documento (obra + tareas)
 * @returns {Promise<Object>} Obra creada con tareas
 */
const saveProcessedDocument = async (extractedData) => {
   if (!extractedData || !extractedData.obra || !extractedData.tareas) {
      throw new Error('Datos incompletos: se requiere obra y tareas');
   }
   
   if (!Array.isArray(extractedData.tareas) || extractedData.tareas.length === 0) {
      throw new Error('Debe haber al menos una tarea');
   }
   
   const { obra: obraData, tareas: tareasData } = extractedData;
   
   // 1. Transformar y crear todas las tareas primero
   const tareasCreadas = [];
   const tareasConCostos = []; // Guardar precio_total para ObraTarea
   
   for (const tareaData of tareasData) {
      try {
         // Transformar datos de tarea
         const transformedTarea = transformTareaData(tareaData);
         
         // Crear tarea en BD
         const nuevaTarea = new Tarea(transformedTarea);
         await nuevaTarea.save();
         
         // Convertir ObjectId a string para evitar problemas en createObra
         const tareaIdString = nuevaTarea._id.toString();
         tareasCreadas.push(tareaIdString);
         tareasConCostos.push({
            tareaId: nuevaTarea._id, // Mantener ObjectId para ObraTarea
            precio_total: tareaData.precio_total || 0
         });
      } catch (error) {
         console.error('❌ Error creando tarea:', error.message);
         // Si hay error, eliminar tareas ya creadas antes de lanzar error
         if (tareasCreadas.length > 0) {
            await Tarea.deleteMany({ _id: { $in: tareasCreadas } });
         }
         throw new Error(`Error creando tarea: ${error.message}`);
      }
   }
   
   // 2. Transformar datos de obra
   const transformedObra = transformObraData(obraData, tareasData);
   transformedObra.tareas = tareasCreadas; // IDs de tareas creadas
   
   // 3. Crear obra usando obraService.createObra
   let obraCreada;
   try {
      obraCreada = await obraService.createObra(transformedObra);
   } catch (error) {
      // Si hay error al crear obra, eliminar tareas creadas
      if (tareasCreadas.length > 0) {
         await Tarea.deleteMany({ _id: { $in: tareasCreadas } });
      }
      throw error;
   }
   
   // 4. Actualizar ObraTarea con los costos (createObra ya crea ObraTarea, pero sin costo)
   // Necesitamos actualizar los costos en ObraTarea
   try {
      // obraCreada.id es un string (MongoDB _id convertido a string)
      const obraId = obraCreada.id;
      const Obra = require('../models/Obra.js');
      
      // Actualizar cada ObraTarea con su costo (MongoDB acepta strings directamente)
      const updatePromises = tareasConCostos.map(({ tareaId, precio_total }) => {
         return ObraTarea.findOneAndUpdate(
            { obraId: obraId, tareaId: tareaId },
            { $set: { costo: precio_total } },
            { new: true }
         );
      });
      
      await Promise.all(updatePromises);
      
      // Recalcular costoFinal de la obra
      const todasObraTareas = await ObraTarea.find({ obraId: obraId });
      const costoTotalActualizado = todasObraTareas.reduce((sum, ot) => sum + (ot.costo || 0), 0);
      
      // Actualizar obra con costoFinal
      await Obra.findByIdAndUpdate(obraId, {
         $set: {
            costo: costoTotalActualizado,
            costoEstimado: costoTotalActualizado,
            costoFinal: costoTotalActualizado
         }
      });
      
      // Obtener obra actualizada
      obraCreada = await obraService.getObraById(obraId);
      
   } catch (error) {
      console.error('❌ Error actualizando costos en ObraTarea:', error.message);
      // No lanzar error, los costos se pueden actualizar después
   }
   
   return obraCreada;
};

module.exports = {
   saveProcessedDocument,
   transformObraData,
   transformTareaData,
   parseFecha,
   calculateCostoTotal
};
