import { supabase } from '@prisma-glow/supabase-client';

async function main() {
  console.log('Seeding database...');
  // Add seed logic here
  console.log('Seed complete.');
}

main().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
