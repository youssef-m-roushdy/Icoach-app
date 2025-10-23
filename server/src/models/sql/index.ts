// SQL Models - Sequelize
import User from './User.js';

// Define associations here when you add more models
// Example:
// User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
// Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Export all SQL models
export {
  User,
};

// Export types
export type { UserAttributes, UserCreationAttributes } from './User.js';

// Default export with all models for convenience
const sqlModels = {
  User,
};

export default sqlModels;