const Obra = require('../models/Obra.js');
const ObraTarea = require('../models/ObraTarea.js');

const getDashboardData = async () => {
   // Obtener todas las obras
   const obras = await Obra.find({}).populate('tareas');
   
   // 1. Porcentaje de avance de las obras
   // Calcular para cada obra: (tareas finalizadas / total tareas) * 100
   const obrasConAvance = await Promise.all(obras.map(async (obra) => {
      const obraTareas = await ObraTarea.find({ obraId: obra._id });
      const totalTareas = obraTareas.length;
      const tareasFinalizadas = obraTareas.filter(ot => ot.state === 'finalizado').length;
      const porcentajeAvance = totalTareas > 0 ? (tareasFinalizadas / totalTareas) * 100 : 0;
      
      return {
         obraId: obra._id.toString(),
         porcentajeAvance: Math.round(porcentajeAvance * 100) / 100  // Redondear a 2 decimales
      };
   }));
   
   // Calcular porcentaje promedio general
   const porcentajePromedio = obrasConAvance.length > 0 
      ? obrasConAvance.reduce((sum, o) => sum + o.porcentajeAvance, 0) / obrasConAvance.length
      : 0;
   
   // 2. Número de obras por estado
   const obrasPorEstado = {
      pendiente: 0,
      en_proceso: 0,
      finalizado: 0,
      estancado: 0
   };
   
   obras.forEach(obra => {
      if (obra.estado && obrasPorEstado.hasOwnProperty(obra.estado)) {
         obrasPorEstado[obra.estado]++;
      }
   });
   
   // 3. Número de tareas por estado
   const tareasPorEstado = {
      pendiente: 0,
      en_proceso: 0,
      finalizado: 0,
      estancado: 0
   };
   
   // Obtener todas las relaciones ObraTarea
   const todasLasObraTareas = await ObraTarea.find({});
   
   todasLasObraTareas.forEach(obraTarea => {
      if (obraTarea.state && tareasPorEstado.hasOwnProperty(obraTarea.state)) {
         tareasPorEstado[obraTarea.state]++;
      }
   });
   
   // 4. Costo total de todas las obras
   // Sumar costoFinal si existe, si no, sumar costoEstimado, si no, sumar costo
   const costoTotal = obras.reduce((sum, obra) => {
      const costo = obra.costoFinal || obra.costoEstimado || obra.costo || 0;
      return sum + costo;
   }, 0);
   
   return {
      porcentaje_avance_promedio: Math.round(porcentajePromedio * 100) / 100,
      obras_por_estado: obrasPorEstado,
      tareas_por_estado: tareasPorEstado,
      costo_total: costoTotal,
      total_obras: obras.length,
      total_tareas: todasLasObraTareas.length
   };
};

module.exports = {
   getDashboardData
};
