import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add the new enum value. Kept as its own statement (not combined with the
  // backfill below) because Postgres won't let a newly added enum value be
  // used by a statement that runs in the same transaction that added it,
  // depending on PG version.
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_chat_participants_role" ADD VALUE IF NOT EXISTS 'owner';
  `);

  // Backfill: whoever created a group conversation becomes its owner.
  // 1-1 conversations don't need a distinguished owner, so those rows are
  // left as 'member'.
  await queryInterface.sequelize.query(`
    UPDATE chat_participants cp
    SET role = 'owner'
    FROM chat_conversations cc
    WHERE cp.conversation_id = cc.id
      AND cp.user_id = cc.created_by
      AND cc.is_group = true;
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert backfilled owners before touching the enum, so no row references
  // 'owner' once it's removed.
  await queryInterface.sequelize.query(`
    UPDATE chat_participants
    SET role = 'member'
    WHERE role = 'owner';
  `);

  // Postgres has no direct "DROP VALUE" for enums. The safe way to remove one
  // is to swap the column onto a fresh enum type that excludes it, then drop
  // the old type.
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_chat_participants_role" RENAME TO "enum_chat_participants_role_old";
  `);
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_chat_participants_role" AS ENUM ('member', 'admin');
  `);
  await queryInterface.sequelize.query(`
    ALTER TABLE chat_participants
      ALTER COLUMN role DROP DEFAULT,
      ALTER COLUMN role TYPE "enum_chat_participants_role"
        USING role::text::"enum_chat_participants_role",
      ALTER COLUMN role SET DEFAULT 'member';
  `);
  await queryInterface.sequelize.query(`
    DROP TYPE "enum_chat_participants_role_old";
  `);
}