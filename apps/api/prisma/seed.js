"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const adminEmail = 'admin@mediumformat.id';
    const exists = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!exists) {
        await prisma.user.create({
            data: {
                email: adminEmail,
                name: 'Admin',
                passwordHash: await bcrypt.hash('changeme123', 12),
                role: 'ADMIN',
            },
        });
        console.log('✓ Seeded admin user: admin@mediumformat.id / changeme123');
    }
    else {
        console.log('✓ Admin user already exists, skipping seed.');
    }
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map