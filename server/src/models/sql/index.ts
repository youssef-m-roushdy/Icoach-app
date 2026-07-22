// SQL Models - Sequelize
import User from './User.js';
import Food from './Food.js';
import Workout from './Workout.js';
import SavedWorkout from './SavedWorkout.js';
import Injury from './Injury.js';
import FitnessPlan from './FitnessPlan.js';
import ChatHistory from './ChatHistory.js';
import ChatConversation from './ChatConversation.js';
import ChatParticipant from './ChatParticipant.js';
import ChatMessage from './ChatMessage.js';
import WorkoutInjury from './WorkoutInjury.js';
import UserInjury from './UserInjury.js';
import WorkoutSession from './WorkoutSession.js';
import UserMetrics from './UserMetrics.js';
import PersonalBest from './PersonalBest.js';
import DailyActivity from './DailyActivity.js';
import WaterIntake from './WaterIntake.js';
import WorkoutSessionSet from './WorkoutSessionSet.js';
import ExpoToken from './ExpoToken.js';
// NEW: Allergy models
import Allergen from './Allergen.js';
import FoodAllergen from './FoodAllergen.js';
import UserAllergy from './UserAllergy.js';
import Notification from './Notification.js';

// Community platform models
import Friendship from './Friendship.js';
import Post from './Post.js';
import PostLike from './PostLike.js';
import PostComment from './PostComment.js';
import Story from './Story.js';
import StoryView from './StoryView.js';
import Store, { StoreStatus } from './Store.js';
import StoreProduct, { ProductStatus } from './StoreProduct.js';
import UserSubscription from './UserSubscription.js';
import Order, { OrderStatus } from './Order.js';
import OrderItem from './OrderItem.js';
import Cart from './Cart.js';
import CartItem from './Cartitem.js';

// Define associations

// Existing associations...
User.hasMany(SavedWorkout, { foreignKey: 'userId', as: 'savedWorkouts' });
SavedWorkout.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Workout.hasMany(SavedWorkout, { foreignKey: 'workoutId', as: 'savedBy' });
SavedWorkout.belongsTo(Workout, { foreignKey: 'workoutId', as: 'workout' });

Workout.belongsToMany(Injury, { through: WorkoutInjury, foreignKey: 'workoutId', as: 'injuries' });
Injury.belongsToMany(Workout, { through: WorkoutInjury, foreignKey: 'injuryId', as: 'workouts' });

// WorkoutInjury associations (for direct queries if needed)
WorkoutInjury.belongsTo(Workout, { foreignKey: 'workoutId', as: 'workout' });
WorkoutInjury.belongsTo(Injury, { foreignKey: 'injuryId', as: 'injury' });
Workout.hasMany(WorkoutInjury, { foreignKey: 'workoutId', as: 'workoutInjuries' });
Injury.hasMany(WorkoutInjury, { foreignKey: 'injuryId', as: 'workoutInjuries' });

User.belongsToMany(Injury, { through: UserInjury, foreignKey: 'userId', as: 'injuries' });
Injury.belongsToMany(User, { through: UserInjury, foreignKey: 'injuryId', as: 'users' });

// UserInjury associations (for direct queries if needed)
UserInjury.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserInjury.belongsTo(Injury, { foreignKey: 'injuryId', as: 'injury' });
User.hasMany(UserInjury, { foreignKey: 'userId', as: 'userInjuries' });
Injury.hasMany(UserInjury, { foreignKey: 'injuryId', as: 'userInjuries' });

User.hasMany(FitnessPlan, { foreignKey: 'userId', as: 'plans' });
FitnessPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ChatHistory, { foreignKey: 'userId', as: 'chatHistory' });
ChatHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User-to-user chat associations
ChatConversation.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(ChatConversation, { foreignKey: 'createdBy', as: 'createdConversations' });

ChatConversation.hasMany(ChatParticipant, { foreignKey: 'conversationId', as: 'participants' });
ChatParticipant.belongsTo(ChatConversation, { foreignKey: 'conversationId', as: 'conversation' });

ChatConversation.hasMany(ChatMessage, { foreignKey: 'conversationId', as: 'messages' });
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversationId', as: 'conversation' });

User.hasMany(ChatParticipant, { foreignKey: 'userId', as: 'chatParticipations' });
ChatParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// ============================================
// ASSOCIATIONS for WorkoutSession, UserMetrics, PersonalBest
// ============================================

// User ↔ WorkoutSession (one-to-many)
User.hasMany(WorkoutSession, { foreignKey: 'userId', as: 'workoutSessions' });
WorkoutSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Workout ↔ WorkoutSession (one-to-many)
Workout.hasMany(WorkoutSession, { foreignKey: 'workoutId', as: 'sessions' });
WorkoutSession.belongsTo(Workout, { foreignKey: 'workoutId', as: 'workout' });

// User ↔ UserMetrics (one-to-many)
User.hasMany(UserMetrics, { foreignKey: 'userId', as: 'metricsHistory' });
UserMetrics.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ PersonalBest (one-to-many)
User.hasMany(PersonalBest, { foreignKey: 'userId', as: 'personalBests' });
PersonalBest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Workout ↔ PersonalBest (one-to-many)
Workout.hasMany(PersonalBest, { foreignKey: 'workoutId', as: 'personalBests' });
PersonalBest.belongsTo(Workout, { foreignKey: 'workoutId', as: 'workout' });

// DailyActivity ↔ User (one-to-many)
User.hasMany(DailyActivity, { foreignKey: 'userId', as: 'activities' });
DailyActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// WaterIntake model associations
User.hasMany(WaterIntake, { foreignKey: 'userId', as: 'waterIntakes' });
WaterIntake.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// WorkoutSession -> WorkoutSessionSet (one-to-many)
WorkoutSession.hasMany(WorkoutSessionSet, {
  foreignKey: 'sessionId',
  as: 'sets',
  onDelete: 'CASCADE',
});
WorkoutSessionSet.belongsTo(WorkoutSession, {
  foreignKey: 'sessionId',
  as: 'session',
});

// User ↔ ExpoToken (one-to-many)
User.hasMany(ExpoToken, { 
  foreignKey: 'userId', 
  as: 'pushTokens', 
  onDelete: 'CASCADE' 
});
ExpoToken.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});

// ============================================
// NEW ASSOCIATIONS for Allergy module
// ============================================

// Food ↔ Allergen (many-to-many through FoodAllergen)
Food.belongsToMany(Allergen, { 
  through: FoodAllergen, 
  foreignKey: 'foodId', 
  otherKey: 'allergenId',
  as: 'allergens' 
});
Allergen.belongsToMany(Food, { 
  through: FoodAllergen, 
  foreignKey: 'allergenId', 
  otherKey: 'foodId',
  as: 'foods' 
});

// User ↔ Allergen (many-to-many through UserAllergy)
User.belongsToMany(Allergen, { 
  through: UserAllergy, 
  foreignKey: 'userId', 
  otherKey: 'allergenId',
  as: 'allergies' 
});
Allergen.belongsToMany(User, { 
  through: UserAllergy, 
  foreignKey: 'allergenId', 
  otherKey: 'userId',
  as: 'users' 
});

// FoodAllergen associations (for direct queries if needed)
FoodAllergen.belongsTo(Food, { foreignKey: 'foodId', as: 'food' });
FoodAllergen.belongsTo(Allergen, { foreignKey: 'allergenId', as: 'allergen' });
Food.hasMany(FoodAllergen, { foreignKey: 'foodId', as: 'foodAllergens' });
Allergen.hasMany(FoodAllergen, { foreignKey: 'allergenId', as: 'foodAllergens' });

// UserAllergy associations (for direct queries if needed)
UserAllergy.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserAllergy.belongsTo(Allergen, { foreignKey: 'allergenId', as: 'allergen' });
User.hasMany(UserAllergy, { foreignKey: 'userId', as: 'userAllergies' });
Allergen.hasMany(UserAllergy, { foreignKey: 'allergenId', as: 'userAllergies' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ============================================
// COMMUNITY PLATFORM ASSOCIATIONS
// ============================================

// Friendships
User.hasMany(Friendship, { foreignKey: 'requesterId', as: 'sentFriendRequests' });
Friendship.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });

User.hasMany(Friendship, { foreignKey: 'addresseeId', as: 'receivedFriendRequests' });
Friendship.belongsTo(User, { foreignKey: 'addresseeId', as: 'addressee' });

// Posts
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Post likes
Post.hasMany(PostLike, { foreignKey: 'postId', as: 'likes', onDelete: 'CASCADE' });
PostLike.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

User.hasMany(PostLike, { foreignKey: 'userId', as: 'postLikes', onDelete: 'CASCADE' });
PostLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Post comments
Post.hasMany(PostComment, { foreignKey: 'postId', as: 'comments', onDelete: 'CASCADE' });
PostComment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

User.hasMany(PostComment, { foreignKey: 'userId', as: 'postComments', onDelete: 'CASCADE' });
PostComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Stories
User.hasMany(Story, { foreignKey: 'userId', as: 'stories', onDelete: 'CASCADE' });
Story.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Story views
Story.hasMany(StoryView, { foreignKey: 'storyId', as: 'views', onDelete: 'CASCADE' });
StoryView.belongsTo(Story, { foreignKey: 'storyId', as: 'story' });

User.hasMany(StoryView, { foreignKey: 'userId', as: 'storyViews', onDelete: 'CASCADE' });
StoryView.belongsTo(User, { foreignKey: 'userId', as: 'viewer' });

// Stores
User.hasMany(Store, { foreignKey: 'ownerId', as: 'stores', onDelete: 'CASCADE' });
Store.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Store products
Store.hasMany(StoreProduct, { foreignKey: 'storeId', as: 'products', onDelete: 'CASCADE' });
StoreProduct.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ============================================
// PAYMENT / SUBSCRIPTION ASSOCIATIONS
// ============================================

// User ↔ UserSubscription (one-to-many, as the subscriber)
User.hasMany(UserSubscription, { foreignKey: 'userId', as: 'subscriptions' });
UserSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ UserSubscription (one-to-many, as the coach being subscribed to)
User.hasMany(UserSubscription, { foreignKey: 'coachId', as: 'coachSubscriptions' });
UserSubscription.belongsTo(User, { foreignKey: 'coachId', as: 'coach' });

// Orders
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'buyer' });

Store.hasMany(Order, { foreignKey: 'storeId', as: 'orders' });
Order.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

StoreProduct.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(StoreProduct, { foreignKey: 'productId', as: 'product' });

User.hasOne(Cart, { foreignKey: 'userId', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

StoreProduct.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems' });
CartItem.belongsTo(StoreProduct, { foreignKey: 'productId', as: 'product' });

// Optional: WorkoutSession ↔ PersonalBest (if you want to track which session set a PB)
// This would require adding workoutSessionId to PersonalBest model first
// PersonalBest.belongsTo(WorkoutSession, { foreignKey: 'workoutSessionId', as: 'session' });
// WorkoutSession.hasOne(PersonalBest, { foreignKey: 'workoutSessionId', as: 'personalBest' });

// Export all SQL models
export {
  User,
  Food,
  Workout,
  SavedWorkout,
  Injury,
  FitnessPlan,
  ChatHistory,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  WorkoutSession,
  UserMetrics,
  PersonalBest,
  DailyActivity, 
  WorkoutInjury,
  UserInjury,
  WaterIntake,
  WorkoutSessionSet,
  ExpoToken,
  Allergen,
  FoodAllergen,
  UserAllergy,
  Notification,
  // Community platform models
  Friendship,
  Post,
  PostLike,
  PostComment,
  Story,
  StoryView,
  Store,
  StoreProduct,
  StoreStatus,
  ProductStatus,
  UserSubscription,
  Order,        
  OrderItem,    
  OrderStatus,
  Cart,
  CartItem
};

// Export types
export type { UserAttributes, UserCreationAttributes, UserWithCalculatedFields } from './User.js';
export type { FoodAttributes, FoodCreationAttributes } from './Food.js';
export type { WorkoutAttributes, WorkoutCreationAttributes } from './Workout.js';
export type { SavedWorkoutAttributes, SavedWorkoutCreationAttributes } from './SavedWorkout.js';
export type { InjuryAttributes, InjuryCreationAttributes } from './Injury.js';
export type { FitnessPlanAttributes, FitnessPlanCreationAttributes } from './FitnessPlan.js';
export type { ChatHistoryAttributes, ChatHistoryCreationAttributes } from './ChatHistory.js';
export type { ChatConversationAttributes, ChatConversationCreationAttributes } from './ChatConversation.js';
export type { ChatParticipantAttributes, ChatParticipantCreationAttributes } from './ChatParticipant.js';
export type { ChatMessageAttributes, ChatMessageCreationAttributes } from './ChatMessage.js';
export type { WorkoutInjuryAttributes, WorkoutInjuryCreationAttributes } from './WorkoutInjury.js';
export type { UserInjuryAttributes, UserInjuryCreationAttributes } from './UserInjury.js';
export type { WorkoutSessionAttributes, WorkoutSessionCreationAttributes } from './WorkoutSession.js';
export type { UserMetricsAttributes, UserMetricsCreationAttributes } from './UserMetrics.js';
export type { PersonalBestAttributes, PersonalBestCreationAttributes } from './PersonalBest.js';
export type { DailyActivityAttributes, DailyActivityCreationAttributes } from './DailyActivity.js'; 
export type { WaterIntakeAttributes, WaterIntakeCreationAttributes } from './WaterIntake.js'; 
export type { WorkoutSessionSetAttributes, WorkoutSessionSetCreationAttributes } from './WorkoutSessionSet.js';
export type { ExpoTokenAttributes, ExpoTokenCreationAttributes } from './ExpoToken.js';
// NEW: Allergy types (only Allergen exports types, junction tables don't)
export type { AllergenAttributes, AllergenCreationAttributes } from './Allergen.js';
export type { NotificationAttributes, NotificationCreationAttributes } from './Notification.js';

// Community platform types
export type { PostAttributes, PostCreationAttributes, PostMedia } from './Post.js';
export type { PostLikeAttributes, PostLikeCreationAttributes } from './PostLike.js';
export type { PostCommentAttributes, PostCommentCreationAttributes } from './PostComment.js';
export type { StoryAttributes, StoryCreationAttributes, StoryMedia } from './Story.js';
export type { StoryViewAttributes, StoryViewCreationAttributes } from './StoryView.js';
export type { StoreAttributes, StoreCreationAttributes, StoreStatusValue } from './Store.js';
export type {
  StoreProductAttributes,
  StoreProductCreationAttributes,
  ProductStatusValue,
  ProductMedia,
} from './StoreProduct.js';

// Order types
export type { OrderAttributes, OrderCreationAttributes, OrderStatusValue } from './Order.js';
export type { OrderItemAttributes, OrderItemCreationAttributes } from './OrderItem.js';

// Default export with all models for convenience
const sqlModels = {
  User,
  Food,
  Workout,
  SavedWorkout,
  Injury,
  FitnessPlan,
  ChatHistory,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  WorkoutInjury,
  UserInjury,
  WorkoutSession,
  UserMetrics,
  PersonalBest,
  DailyActivity, 
  WaterIntake, 
  WorkoutSessionSet,
  ExpoToken,
  Allergen,
  FoodAllergen,
  UserAllergy,
  Notification,
  Friendship,
  Post,
  PostLike,
  PostComment,
  Story,
  StoryView,
  Store,
  StoreProduct,
  UserSubscription,
  Order,
  OrderItem,
  Cart,
  CartItem
};

export default sqlModels;