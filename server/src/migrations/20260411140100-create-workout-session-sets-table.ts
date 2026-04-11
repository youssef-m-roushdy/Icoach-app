// server/src/db/migrations/20260411140100-create-workout-session-sets-table.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('💪📊 Creating workout_session_sets table...');

  await queryInterface.createTable('workout_session_sets', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'workout_sessions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    set_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reps: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // Existing sessions are already completed
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rest_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Migrate existing data from workout_sessions to workout_session_sets
  console.log('📦 Migrating existing workout session data to sets...');
  
  const [sessions] = await queryInterface.sequelize.query(`
    SELECT id, reps, weight, sets, completed_at 
    FROM workout_sessions 
    WHERE sets > 0
  `);

  if (Array.isArray(sessions) && sessions.length > 0) {
    for (const session of sessions as any[]) {
      // Create one set record for each set in the session
      // This assumes all sets had the same weight/reps (simplified migration)
      for (let setNum = 1; setNum <= session.sets; setNum++) {
        await queryInterface.bulkInsert('workout_session_sets', [{
          session_id: session.id,
          set_number: setNum,
          reps: session.reps,
          weight: session.weight || 0,
          is_completed: true,
          completed_at: session.completed_at,
          created_at: new Date(),
          updated_at: new Date(),
        }]);
      }
    }
    console.log(`✅ Migrated ${sessions.length} sessions to sets`);
  }

  // Add unique constraint for session_id and set_number
  await queryInterface.addConstraint('workout_session_sets', {
    fields: ['session_id', 'set_number'],
    type: 'unique',
    name: 'workout_session_sets_session_set_unique',
  });

  // Add indexes
  await queryInterface.addIndex('workout_session_sets', ['session_id'], {
    name: 'workout_session_sets_session_id_idx',
  });

  await queryInterface.addIndex('workout_session_sets', ['is_completed'], {
    name: 'workout_session_sets_completed_idx',
  });

  console.log('✅ Workout session sets table created successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🗑️ Dropping workout_session_sets table...');
  await queryInterface.dropTable('workout_session_sets');
  console.log('✅ Workout session sets table dropped');
}