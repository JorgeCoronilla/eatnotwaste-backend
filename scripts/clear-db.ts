import { prisma } from '../src/config/database';
import * as readline from 'readline';

async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('⚠️  DATABASE CLEANUP UTILITY ⚠️');
  console.log('================================');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not defined.');
    process.exit(1);
  }

  // Mask sensitive parts of the URL for display
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`Target Database: ${maskedUrl}`);
  
  if (dbUrl.includes('railway.app') || dbUrl.includes('prod') || dbUrl.includes('postgres.railway.internal')) {
    console.warn('\n🚨 WARNING: YOU ARE ABOUT TO WIPE A PRODUCTION/REMOTE DATABASE! 🚨');
  }

  console.log('\nThis will delete ALL data from the following tables:');
  console.log('- Users (and Settings)');
  console.log('- Products');
  console.log('- User Items & Products');
  console.log('- Movements & History');
  console.log('- Device Tokens & Notifications');
  console.log('- Product Cache');

  const confirmed = await confirmAction('\nAre you ABSOLUTELY SURE you want to proceed?');
  
  if (!confirmed) {
    console.log('❌ Operation cancelled.');
    process.exit(0);
  }

  // Double confirmation for production
  if (dbUrl.includes('railway') || dbUrl.includes('prod')) {
    const doubleCheck = await confirmAction('🧨 FINAL WARNING: This action is irreversible. Type "y" to wipe EVERYTHING:');
    if (!doubleCheck) {
      console.log('❌ Operation cancelled.');
      process.exit(0);
    }
  }

  console.log('\n🗑️  Starting cleanup...');

  try {
    // Delete in order to avoid FK constraints (though Cascade mostly handles it)
    
    console.log('Cleaning NotificationHistory...');
    await prisma.notificationHistory.deleteMany({});

    console.log('Cleaning UserDeviceTokens...');
    await prisma.userDeviceToken.deleteMany({});

    console.log('Cleaning ItemMovements...');
    await prisma.itemMovement.deleteMany({});

    console.log('Cleaning UserItems...');
    await prisma.userItem.deleteMany({});
    
    console.log('Cleaning UserProductLocations...');
    await prisma.userProductLocation.deleteMany({});

    console.log('Cleaning UserProducts...');
    await prisma.userProduct.deleteMany({});

    console.log('Cleaning Products (non-system)...');
    // Using deleteMany on products
    await prisma.product.deleteMany({});

    console.log('Cleaning Users...');
    await prisma.user.deleteMany({});
    
    console.log('Cleaning ProductCache...');
    await prisma.productCache.deleteMany({});

    console.log('\n✅ Database successfully cleared!');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
