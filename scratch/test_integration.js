import pg from 'pg';
import express from 'express';
import dotenv from 'dotenv';
import transfersRouter from '../backend/dist/routes/transfers.js';
import { initDb } from '../backend/dist/database/db.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/transfers', transfersRouter);

async function runTests() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ ERROR: La variable de entorno DATABASE_URL no está configurada.');
    console.log('Por favor, ejecuta el script de la siguiente manera:');
    console.log('DATABASE_URL="su_cadena_de_conexion_de_neon" node scratch/test_integration.js');
    process.exit(1);
  }

  console.log('🔄 Iniciando pruebas de integración técnica para el Módulo 3...');

  // 1. Inicializar base de datos
  console.log('\n--- 1. Conexión y Validación del Esquema ---');
  let pool;
  try {
    pool = await initDb();
    console.log('✅ Base de datos conectada e inicializada correctamente.');
  } catch (err) {
    console.error('❌ Falló la inicialización de la base de datos:', err.message);
    process.exit(1);
  }

  // Levantar servidor temporal
  const PORT = 3005;
  const server = app.listen(PORT, async () => {
    console.log(`✅ Servidor de prueba Express levantado en http://localhost:${PORT}`);

    try {
      // Test 1: GET /api/transfers/countries
      console.log('\n--- Test 1: GET /api/transfers/countries ---');
      const countriesRes = await fetch(`http://localhost:${PORT}/api/transfers/countries`);
      const countries = await countriesRes.json();
      console.log(`Status: ${countriesRes.status}`);
      console.log(`Países obtenidos: ${countries.length}`);
      console.log('Muestra de países:', countries.slice(0, 3));
      
      const hasUS = countries.some(c => c.country_code === 'US');
      const hasES = countries.some(c => c.country_code === 'ES');
      if (hasUS && hasES) {
        console.log('✅ Catálogo de adecuación de países cargado correctamente.');
      } else {
        console.error('❌ Faltan países clave en el catálogo de referencia.');
      }

      // Test 2: POST /api/transfers
      console.log('\n--- Test 2: POST /api/transfers ---');
      const transferData = {
        domain: 'localhost:3000',
        vendor_name: 'Mailchimp QA Test',
        destination_country: 'United States',
        data_categories: ['email', 'nombre'],
        transfer_mechanism: 'STANDARD_CLAUSES',
        has_signed_scc: true,
        scc_document_url: 'https://mailchimp.com/scc.pdf'
      };
      
      const postRes = await fetch(`http://localhost:${PORT}/api/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData)
      });
      const createdTransfer = await postRes.json();
      console.log(`Status: ${postRes.status}`);
      console.log('Transferencia creada:', createdTransfer);
      if (createdTransfer && createdTransfer.id) {
        console.log('✅ Transferencia registrada exitosamente.');
      } else {
        console.error('❌ No se pudo crear la transferencia.');
      }

      // Test 3: GET /api/transfers
      console.log('\n--- Test 3: GET /api/transfers ---');
      const getRes = await fetch(`http://localhost:${PORT}/api/transfers?domain=localhost:3000`);
      const transfers = await getRes.json();
      console.log(`Status: ${getRes.status}`);
      console.log(`Total transferencias para localhost:3000: ${transfers.length}`);
      const found = transfers.find(t => t.id === createdTransfer.id);
      if (found) {
        console.log('✅ Transferencia recuperada correctamente desde la base de datos.');
      } else {
        console.error('❌ La transferencia creada no fue encontrada en el listado.');
      }

      // Test 4: POST /api/transfers/generate-scc
      console.log('\n--- Test 4: POST /api/transfers/generate-scc ---');
      const sccData = {
        exporterName: 'PrivacyTech Chile SpA',
        exporterRut: '76.123.456-7',
        exporterAddress: 'Av. Apoquindo 1234, Las Condes',
        importerName: 'Mailchimp Inc.',
        importerCountry: 'Estados Unidos',
        importerAddress: 'Ponce de Leon Ave, Atlanta',
        dataCategories: ['email', 'nombre']
      };

      const sccRes = await fetch(`http://localhost:${PORT}/api/transfers/generate-scc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sccData)
      });
      const sccJson = await sccRes.json();
      console.log(`Status: ${sccRes.status}`);
      console.log('Fragmento de Cláusulas Creado:');
      console.log(sccJson.sccContent ? sccJson.sccContent.substring(0, 300) + '...' : '❌ Sin contenido');
      if (sccJson.sccContent && sccJson.sccContent.includes('CLÁUSULAS CONTRACTUALES TIPO')) {
        console.log('✅ Cláusulas Contractuales Tipo generadas exitosamente en Markdown.');
      } else {
        console.error('❌ Error al redactar las cláusulas modelo.');
      }

      // Limpieza (Delete test transfer)
      console.log('\n--- Limpieza: DELETE /api/transfers/:id ---');
      const delRes = await fetch(`http://localhost:${PORT}/api/transfers/${createdTransfer.id}`, {
        method: 'DELETE'
      });
      console.log(`Status: ${delRes.status}`);
      console.log('✅ Registro de prueba de transferencia eliminado.');

    } catch (e) {
      console.error('❌ Error durante la ejecución de las pruebas:', e);
    } finally {
      server.close();
      await pool.end();
      console.log('\n🏁 Pruebas de integración finalizadas.');
    }
  });
}

runTests();
