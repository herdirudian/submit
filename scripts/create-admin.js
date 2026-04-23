
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').trim();
  const password = (process.env.ADMIN_PASSWORD || process.argv[3] || '').trim();
  const name = (process.env.ADMIN_NAME || process.argv[4] || 'Admin').trim();

  if (!email || !password) {
    console.error('Usage: ADMIN_EMAIL="you@domain.com" ADMIN_PASSWORD="strong-password" node scripts/create-admin.js');
    console.error('Or: node scripts/create-admin.js you@domain.com strong-password "Admin Name"');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('ADMIN_PASSWORD must be at least 10 characters');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
        password: hashedPassword
    },
    create: {
      email,
      name,
      password: hashedPassword,
    },
  });

  console.log(`Admin user ensured: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
