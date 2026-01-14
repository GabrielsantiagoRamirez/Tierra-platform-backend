const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
   console.error('❌ GEMINI_API_KEY no está configurada');
   process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
   try {
      console.log('🔍 Listando modelos disponibles...\n');
      
      // Intentar listar modelos (si el SDK lo soporta)
      // Nota: El SDK puede no tener un método directo, así que probaremos modelos comunes
      
      const modelsToTest = [
         'gemini-pro',
         'gemini-1.5-pro',
         'gemini-1.5-flash',
         'gemini-1.5-pro-001',
         'gemini-1.5-pro-002',
         'gemini-1.5-flash-001',
         'gemini-1.5-flash-002'
      ];
      
      console.log('📋 Probando modelos comunes:\n');
      
      for (const modelName of modelsToTest) {
         try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Intentar una llamada simple para verificar
            const result = await model.generateContent({ 
               contents: [{ role: 'user', parts: [{ text: 'test' }] }] 
            });
            console.log(`✅ ${modelName} - DISPONIBLE`);
         } catch (error) {
            if (error.message.includes('404')) {
               console.log(`❌ ${modelName} - NO DISPONIBLE (404)`);
            } else if (error.message.includes('quota') || error.message.includes('429')) {
               console.log(`⚠️  ${modelName} - DISPONIBLE (pero cuota excedida)`);
            } else {
               console.log(`⚠️  ${modelName} - Error: ${error.message.substring(0, 60)}...`);
            }
         }
      }
      
   } catch (error) {
      console.error('❌ Error:', error.message);
   }
}

listModels();
