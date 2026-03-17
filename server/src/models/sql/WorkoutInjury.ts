import { DataTypes , Model, type CreationOptional } from 'sequelize';
import { sequelize } from '../../config/database.js';
import Injury from './injury.js';

class WorkoutInjury extends Model {
  declare id: CreationOptional<number>;
  declare workoutId: number;
  declare injuryId: number;
  declare readonly createdAt: CreationOptional<Date>;
}

WorkoutInjury.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    workoutId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'workouts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    injuryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'injuries',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'workout_injuries',
    modelName: 'WorkoutInjury',
    timestamps: true,
    updatedAt: false,
  }
);

// العلاقات
Injury.belongsToMany(WorkoutInjury, { through: WorkoutInjury, foreignKey: 'injuryId' });
export default WorkoutInjury;