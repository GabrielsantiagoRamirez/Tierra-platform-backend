const ReportePdf = require('../models/ReportePdf');
const Obra = require('../models/Obra');
const https = require('https');
const http = require('http');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

// Configurar Cloudinary con credenciales desde variables de entorno
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dxywuapq7';
const apiKey = process.env.CLOUDINARY_API_KEY || '836177411616825';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'ZoUJBhDwEA8AJ5tOsi2lBi-B-KY';

cloudinary.config({
   cloud_name: cloudName,
   api_key: apiKey,
   api_secret: apiSecret,
   secure: true
});

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
 * Lista todos los reportes PDF de todas las obras
 * @param {Number} page - Página (opcional, default: 1)
 * @param {Number} limit - Límite por página (opcional, default: 10)
 * @returns {Promise<Object>} Lista paginada de reportes
 */
const listAllReportes = async (page = 1, limit = 10) => {
   const result = await ReportePdf.paginate(
      {},
      {
         page,
         limit,
         sort: { createdAt: -1 }, // Más recientes primero
         populate: ['generatedBy', 'obraId']
      }
   );

   return result;
};


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


const getReportePdfById = async (id) => {
   const reporte = await ReportePdf.findById(id).populate('generatedBy').populate('obraId');
   return reporte;
};


const getReportePdfByClave = async (clave) => {
   const reporte = await ReportePdf.findOne({ clave }).populate('generatedBy').populate('obraId');
   return reporte;
};

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

/**
 * Detecta si una URL es de Cloudinary
 * @param {String} url - URL a verificar
 * @returns {Boolean} true si es URL de Cloudinary
 */
const isCloudinaryUrl = (url) => {
   if (!url || typeof url !== 'string') return false;
   return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

/**
 * Extrae el public_id, folder y version de una URL de Cloudinary
 * @param {String} url - URL de Cloudinary
 * @returns {Object|null} { public_id, folder, version } o null si no se puede extraer
 */
const extractCloudinaryPublicId = (url) => {
   try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Formato: /{resource_type}/upload/{version}/{folder}/{public_id}.{format}
      // Ejemplo: /raw/upload/v1768682990/reportes_pdf/pnvplruabdomk3s0rvhq.pdf
      
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex === -1) return null;
      
      // Después de 'upload' puede venir version (v...), luego folder, luego public_id.format
      const afterUpload = pathParts.slice(uploadIndex + 1);
      
      if (afterUpload.length === 0) return null;
      
      // El último elemento es public_id.format
      const lastPart = afterUpload[afterUpload.length - 1];
      const publicIdWithExt = lastPart.includes('.') ? lastPart.substring(0, lastPart.lastIndexOf('.')) : lastPart;
      
      // Extraer versión (si existe)
      let version = null;
      let folder = null;
      
      if (afterUpload.length > 0) {
         const firstAfterUpload = afterUpload[0];
         if (firstAfterUpload.startsWith('v')) {
            // Hay version
            version = firstAfterUpload; // 'v1768682990'
            
            // Si hay más de 2 elementos, el penúltimo es el folder
            if (afterUpload.length > 2) {
               folder = afterUpload[afterUpload.length - 2];
            }
         } else {
            // No hay version, el folder podría ser el primero si hay más de 1 elemento
            if (afterUpload.length > 1) {
               folder = afterUpload[afterUpload.length - 2];
            }
         }
      }
      
      // Construir public_id completo con folder si existe
      const publicId = folder ? `${folder}/${publicIdWithExt}` : publicIdWithExt;
      
      return { public_id: publicId, folder, version };
   } catch (error) {
      console.error('Error extrayendo public_id de Cloudinary:', error.message);
      return null;
   }
};

/**
 * Genera una URL firmada (signed URL) de Cloudinary para un recurso privado
 * @param {String} publicId - Public ID del recurso en Cloudinary
 * @param {String} resourceType - Tipo de recurso (default: 'raw')
 * @param {String} format - Formato del archivo (default: 'pdf')
 * @param {String} version - Versión de Cloudinary (opcional, ej: 'v1768682990')
 * @returns {String} URL firmada
 */
const generateCloudinarySignedUrl = (publicId, resourceType = 'raw', format = 'pdf', version = null) => {
   try {
      // Limpiar el public_id (eliminar barras iniciales si existen)
      const cleanPublicId = publicId.replace(/^\//, '');
      
      // Construir la cadena para la firma según documentación de Cloudinary
      // IMPORTANTE: La versión debe ser la misma que está en la URL original
      // Si no hay versión, no la incluimos
      let stringToSign;
      let versionPath = '';
      
      if (version && version.startsWith('v')) {
         // Hay versión: v{version}/{public_id}.{format}{api_secret}
         stringToSign = `${version}/${cleanPublicId}.${format}${apiSecret}`;
         versionPath = `${version}/`;
      } else {
         // No hay versión: {public_id}.{format}{api_secret}
         stringToSign = `${cleanPublicId}.${format}${apiSecret}`;
      }
      
      // Calcular SHA-1 hash
      const hash = crypto.createHash('sha1').update(stringToSign).digest('base64');
      
      // Convertir a URL-safe base64 (reemplazar + con -, / con _, y quitar =)
      const urlSafeSignature = hash.replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
      
      // Tomar los primeros 8 caracteres (formato de firma de Cloudinary)
      const signature = urlSafeSignature.substring(0, 8);
      
      // Construir la URL firmada manualmente
      // Formato: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/s--{signature}--/{version}{public_id}.{format}
      // Nota: cloudName solo se usa UNA vez aquí
      const signedUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/s--${signature}--/${versionPath}${cleanPublicId}.${format}`;
      
      // Debug: verificar que la URL no tenga cloud_name duplicado
      if (signedUrl.includes(`${cloudName}/${cloudName}`)) {
         console.error('⚠️  [CLOUDINARY] ERROR: cloud_name duplicado detectado en URL:', signedUrl);
         console.error('   cloudName:', cloudName);
         console.error('   resourceType:', resourceType);
         console.error('   cleanPublicId:', cleanPublicId);
      }
      
      console.log('🔗 [CLOUDINARY] URL firmada generada:', signedUrl);
      console.log('   String firmada:', stringToSign.replace(apiSecret, '***SECRET***'));
      console.log('   Firma (primeros 8 chars):', signature);
      return signedUrl;
   } catch (error) {
      console.error('Error generando URL firmada de Cloudinary:', error.message);
      
      // Fallback: intentar con cloudinary.url() sin sign_url (pero esto no funcionará si está protegido)
      try {
         const fallbackUrl = cloudinary.url(publicId.replace(/^\//, ''), {
            resource_type: resourceType,
            format: format,
            secure: true
         });
         console.warn('⚠️  [CLOUDINARY] Usando URL sin firma como fallback:', fallbackUrl);
         return fallbackUrl;
      } catch (fallbackError) {
         throw new Error(`Failed to generate signed URL: ${error.message}`);
      }
   }
};

/**
 * Descarga el PDF desde la URL de Cloudinary y retorna el buffer
 * Maneja redirects y URLs de Cloudinary
 * Si la URL es pública (/upload/), intenta primero sin firma
 * Si falla con 401, entonces genera URL firmada
 * @param {String} url - URL del PDF en Cloudinary
 * @returns {Promise<Buffer>} Buffer del PDF
 */
const downloadPdfFromUrl = async (url, maxRedirects = 5) => {
   // Si es URL de Cloudinary, verificar si necesita firma
   if (isCloudinaryUrl(url)) {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Detectar el tipo de entrega: /upload/, /private/, /authenticated/
      // El tipo está después de resource_type (índice 2)
      const deliveryType = pathParts[2] || 'upload'; // 'upload', 'private', 'authenticated'
      
      // Si es /upload/, es público por defecto, intentar primero sin firma
      // Si es /private/ o /authenticated/, necesita firma siempre
      if (deliveryType === 'private' || deliveryType === 'authenticated') {
         // Necesita firma obligatoriamente
         const cloudinaryInfo = extractCloudinaryPublicId(url);
         if (cloudinaryInfo) {
            try {
               console.log('🔐 [CLOUDINARY] Recurso privado detectado, generando URL firmada para:', cloudinaryInfo.public_id);
               const resourceType = pathParts[1] || 'raw';
               const lastPart = pathParts[pathParts.length - 1] || '';
               const format = lastPart.includes('.') ? lastPart.substring(lastPart.lastIndexOf('.') + 1) : 'pdf';
               const version = cloudinaryInfo.version || null;
               
               const signedUrl = generateCloudinarySignedUrl(cloudinaryInfo.public_id, resourceType, format, version);
               url = signedUrl;
            } catch (signError) {
               console.warn('⚠️  [CLOUDINARY] No se pudo generar URL firmada, usando URL original:', signError.message);
            }
         }
      }
      // Si es /upload/, continuar sin firma (es público)
      // Si falla con 401, el código de abajo lo manejará y generará la firma
   }
   
   return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
         reject(new Error('Too many redirects'));
         return;
      }

      // Determinar si es HTTP o HTTPS
      const client = url.startsWith('https') ? https : http;

      // Parsear URL para obtener hostname y path
      let urlObj;
      try {
         urlObj = new URL(url);
      } catch (error) {
         reject(new Error(`Invalid URL: ${url}`));
         return;
      }

      const options = {
         hostname: urlObj.hostname,
         port: urlObj.port || (url.startsWith('https') ? 443 : 80),
         path: urlObj.pathname + (urlObj.search || ''),
         method: 'GET',
         headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ConstructionAPI/1.0)',
            'Accept': 'application/pdf, */*'
         }
      };

      const req = client.request(options, (response) => {
         // Manejar redirects (301, 302, 307, 308)
         if (response.statusCode === 301 || response.statusCode === 302 || 
             response.statusCode === 307 || response.statusCode === 308) {
            const redirectUrl = response.headers.location;
            if (!redirectUrl) {
               reject(new Error(`Redirect status ${response.statusCode} but no Location header`));
               return;
            }

            // Si la URL de redirect es relativa, construirla completa
            const absoluteRedirectUrl = redirectUrl.startsWith('http') 
               ? redirectUrl 
               : `${urlObj.protocol}//${urlObj.hostname}${redirectUrl}`;

            // Seguir el redirect recursivamente
            return downloadPdfFromUrl(absoluteRedirectUrl, maxRedirects - 1)
               .then(resolve)
               .catch(reject);
         }

         // Si hay error HTTP (no redirect), manejar según el código
         if (response.statusCode < 200 || response.statusCode >= 300) {
            // Si es 401 y es Cloudinary con /upload/, intentar generar URL firmada
            if (response.statusCode === 401 && isCloudinaryUrl(url) && maxRedirects === 5) {
               // Primera vez que falla, intentar con firma
               const cloudinaryInfo = extractCloudinaryPublicId(url);
               if (cloudinaryInfo) {
                  try {
                     console.log('⚠️  [CLOUDINARY] 401 recibido para recurso /upload/, generando URL firmada...');
                     const urlObj2 = new URL(url);
                     const pathParts2 = urlObj2.pathname.split('/').filter(part => part);
                     const resourceType = pathParts2[1] || 'raw';
                     const lastPart = pathParts2[pathParts2.length - 1] || '';
                     const format = lastPart.includes('.') ? lastPart.substring(lastPart.lastIndexOf('.') + 1) : 'pdf';
                     const version = cloudinaryInfo.version || null;
                     
                     const signedUrl = generateCloudinarySignedUrl(cloudinaryInfo.public_id, resourceType, format, version);
                     // Intentar de nuevo con la URL firmada
                     return downloadPdfFromUrl(signedUrl, maxRedirects - 1)
                        .then(resolve)
                        .catch(reject);
                  } catch (signError) {
                     // Si falla la generación de firma, continuar con el error original
                  }
               }
            }
            
            // Intentar leer el body del error para más información
            let errorBody = '';
            response.on('data', (chunk) => {
               errorBody += chunk.toString();
            });
            response.on('end', () => {
               reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}. Response: ${errorBody.substring(0, 200)}`));
            });
            return;
         }

         // Validar Content-Type solo si está presente (algunos servidores no lo envían)
         const contentType = response.headers['content-type'];
         if (contentType && !contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
            // Si el Content-Type no es PDF, leer un poco del body para verificar
            const chunks = [];
            response.on('data', (chunk) => {
               chunks.push(chunk);
               // Verificar la firma del PDF en los primeros bytes (debe empezar con %PDF)
               if (chunks.length === 1 && chunk.length >= 4) {
                  const header = chunk.toString('utf8', 0, 4);
                  if (header !== '%PDF') {
                     reject(new Error(`Invalid PDF file: Expected PDF header but got "${header}"`));
                     return;
                  }
               }
               // Si ya tenemos suficiente para verificar, acumular el resto
               if (chunks.length > 1) {
                  response.removeAllListeners('data');
                  response.on('data', (chunk) => chunks.push(chunk));
               }
            });

            response.on('end', () => {
               const buffer = Buffer.concat(chunks);
               // Verificar que sea PDF
               if (buffer.length >= 4 && buffer.toString('utf8', 0, 4) !== '%PDF') {
                  reject(new Error(`Invalid PDF file: File does not start with PDF signature`));
                  return;
               }
               resolve(buffer);
            });

            response.on('error', (error) => {
               reject(error);
            });
            return;
         }

         // Acumular chunks del PDF
         const chunks = [];
         
         response.on('data', (chunk) => {
            chunks.push(chunk);
         });

         response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            
            // Verificar que sea PDF (debe empezar con %PDF)
            if (buffer.length >= 4 && buffer.toString('utf8', 0, 4) !== '%PDF') {
               reject(new Error(`Invalid PDF file: File does not start with PDF signature. Got: "${buffer.toString('utf8', 0, 10)}"`));
               return;
            }
            
            resolve(buffer);
         });

         response.on('error', (error) => {
            reject(error);
         });
      });

      req.on('error', (error) => {
         reject(error);
      });

      req.end();
   });
};

module.exports = {
   createReportePdf,
   listAllReportes,
   listReportesByObra,
   getReportePdfById,
   getReportePdfByClave,
   deleteReportePdfById,
   deleteReportePdfByClave,
   downloadPdfFromUrl,
   generateCloudinarySignedUrl,
   isCloudinaryUrl,
   extractCloudinaryPublicId,
   generateClave
};
