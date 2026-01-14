const https = require('https');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
   console.error('❌ GEMINI_API_KEY no está configurada');
   process.exit(1);
}

async function listModels(apiVersion = 'v1beta') {
   return new Promise((resolve, reject) => {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${API_KEY}`;
      
      https.get(url, (res) => {
         let data = '';
         
         res.on('data', (chunk) => {
            data += chunk;
         });
         
         res.on('end', () => {
            try {
               const response = JSON.parse(data);
               resolve(response);
            } catch (error) {
               reject(new Error(`Error parseando respuesta: ${error.message}\nRespuesta: ${data}`));
            }
         });
      }).on('error', (error) => {
         reject(error);
      });
   });
}

async function main() {
   console.log('🔍 Listando modelos disponibles con tu API key...\n');
   console.log(`📋 API Key (primeros 20 caracteres): ${API_KEY.substring(0, 20)}...\n`);
   
   // Probar v1beta primero (el que usa el SDK por defecto)
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
   console.log('📡 Probando API v1beta (usado por el SDK por defecto)');
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
   
   try {
      const responseV1Beta = await listModels('v1beta');
      if (responseV1Beta.models && responseV1Beta.models.length > 0) {
         console.log(`✅ Encontrados ${responseV1Beta.models.length} modelos en v1beta:\n`);
         responseV1Beta.models.forEach(model => {
            console.log(`   📦 ${model.name}`);
            if (model.supportedGenerationMethods) {
               console.log(`      Métodos soportados: ${model.supportedGenerationMethods.join(', ')}`);
            }
         });
      } else {
         console.log('⚠️  No se encontraron modelos en v1beta');
      }
   } catch (error) {
      console.log(`❌ Error con v1beta: ${error.message}`);
   }
   
   console.log('\n');
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
   console.log('📡 Probando API v1 (versión estable)');
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
   
   try {
      const responseV1 = await listModels('v1');
      if (responseV1.models && responseV1.models.length > 0) {
         console.log(`✅ Encontrados ${responseV1.models.length} modelos en v1:\n`);
         responseV1.models.forEach(model => {
            console.log(`   📦 ${model.name}`);
            if (model.supportedGenerationMethods) {
               console.log(`      Métodos soportados: ${model.supportedGenerationMethods.join(', ')}`);
            }
         });
      } else {
         console.log('⚠️  No se encontraron modelos en v1');
      }
   } catch (error) {
      console.log(`❌ Error con v1: ${error.message}`);
   }
   
   console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
   console.log('✅ Análisis completo');
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
