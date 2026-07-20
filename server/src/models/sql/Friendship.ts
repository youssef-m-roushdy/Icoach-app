import {
  DataTypes,
  Model,
  type Optional,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export const FriendshipStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked',
} as const;

export type FriendshipStatusValue = typeof FriendshipStatus[keyof typeof FriendshipStatus];

export interface FriendshipAttributes {
  id: number;
  requesterId: number;
  addresseeId: number;
  status: FriendshipStatusValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendshipCreationAttributes
  extends Optional<FriendshipAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

class Friendship extends Model<
  InferAttributes<Friendship>,
  InferCreationAttributes<Friendship>
> {
  declare id: CreationOptional<number>;
  declare requesterId: number;
  declare addresseeId: number;
  declare status: CreationOptional<FriendshipStatusValue>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

Friendship.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'requester_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    addresseeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'addressee_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(FriendshipStatus)),
      allowNull: false,
      defaultValue: FriendshipStatus.PENDING,
      field: 'status',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'friendships',
    modelName: 'Friendship',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['requester_id'], name: 'friendships_requester_id_idx' },
      { fields: ['addressee_id'], name: 'friendships_addressee_id_idx' },
      { fields: ['status'], name: 'friendships_status_idx' },
      { fields: ['requester_id', 'addressee_id'], unique: true, name: 'friendships_unique_pair_idx' },
      { fields: ['created_at'], name: 'friendships_created_at_idx' },
    ],
  }
);

export default Friendship;
