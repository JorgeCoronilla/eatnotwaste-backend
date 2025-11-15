const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Try to find the SQL seed file in different locations
    let seedSql;
    let seedSqlPath;
    
    // Option 1: seed-products-unified.sql in prisma folder
    const unifiedSeedPath = path.join(__dirname, 'seed-products-unified.sql');
    // Option 2: 01_sample_data.sql in sql/seeds folder  
    const sampleDataPath = path.join(__dirname, '..', 'sql', 'seeds', '01_sample_data.sql');
    
    if (fs.existsSync(unifiedSeedPath)) {
      seedSqlPath = unifiedSeedPath;
      console.log('📄 Using seed-products-unified.sql');
    } else if (fs.existsSync(sampleDataPath)) {
      seedSqlPath = sampleDataPath;
      console.log('📄 Using 01_sample_data.sql');
    } else {
      throw new Error('No seed file found. Looking for seed-products-unified.sql or 01_sample_data.sql');
    }
    
    seedSql = fs.readFileSync(seedSqlPath, 'utf-8');

    // Split SQL commands (basic splitting by semicolon)
    const commands = seedSql
      .split(';')
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📄 Found ${commands.length} SQL commands to execute`);

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`⚡ Executing command ${i + 1}/${commands.length}...`);
          await prisma.$executeRawUnsafe(command);
        } catch (error) {
          console.warn(`⚠️ Warning on command ${i + 1}: ${error.message}`);
          // Continue with other commands even if one fails
        }
      }
    }

    console.log('✅ Database seed completed successfully!');
    
    // Verify some data was inserted
    const productCount = await prisma.product.count();
    
    console.log(`📊 Seed results:`);
    console.log(`   - Products: ${productCount}`);

  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
