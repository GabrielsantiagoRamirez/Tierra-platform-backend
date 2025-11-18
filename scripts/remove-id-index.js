/**
 * Script para eliminar el índice único problemático en el campo 'id'
 * 
 * Ejecutar con: node scripts/remove-id-index.js
 * 
 * Este script elimina el índice único 'id_1' de la colección 'Budgets'
 * que está causando el error E11000 duplicate key error
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Importar la conexión
const connection = require('../database/connection');

async function removeIdIndex() {
   try {
      console.log('🔄 Conectando a MongoDB...');
      await connection();
      
      const db = mongoose.connection.db;
      const collection = db.collection('Budgets');
      
      // Listar todos los índices
      console.log('\n📋 Índices actuales en la colección Budgets:');
      const indexes = await collection.indexes();
      indexes.forEach(index => {
         console.log(`   - ${index.name}:`, JSON.stringify(index.key));
      });
      
      // Buscar el índice problemático
      const idIndex = indexes.find(idx => idx.name === 'id_1' || (idx.key && idx.key.id));
      
      if (idIndex) {
         console.log(`\n🗑️  Eliminando índice problemático: ${idIndex.name}`);
         await collection.dropIndex(idIndex.name);
         console.log('✅ Índice eliminado exitosamente');
      } else {
         console.log('\n✅ No se encontró el índice problemático (id_1)');
      }
      
      // Listar índices después de la eliminación
      console.log('\n📋 Índices después de la eliminación:');
      const indexesAfter = await collection.indexes();
      indexesAfter.forEach(index => {
         console.log(`   - ${index.name}:`, JSON.stringify(index.key));
      });
      
      console.log('\n✅ Proceso completado');
      process.exit(0);
      
   } catch (error) {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
   } finally {
      await mongoose.connection.close();
      console.log('\n🔌 Conexión cerrada');
   }
}

// Ejecutar el script
removeIdIndex();

