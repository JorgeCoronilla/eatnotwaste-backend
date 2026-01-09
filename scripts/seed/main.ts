import { seedUsers } from './modules/users';
import { seedFreshProducts } from './modules/fresh';
import { seedTopProducts } from './modules/top-products';
import { prisma } from '../../src/config/database';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🌱 FreshKeeper Unified Seeder');
  console.log('=============================');

  try {
    if (!command || command === 'all') {
        console.log('🚀 Running FULL seed...\n');
        await seedUsers();
        await seedFreshProducts();
        await seedTopProducts();
    } 
    else if (command === 'users') {
        await seedUsers();
    }
    else if (command === 'fresh') {
        await seedFreshProducts();
    }
    else if (command === 'top') {
        await seedTopProducts();
    }
    else {
        console.log('Unknown command. Available: all, users, fresh, top');
        process.exit(1);
    }

    console.log('\n✨ All requested seeding operations completed successfully.');

  } catch (e) {
    console.error('❌ Critical Seeding Error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
