/**
 * Database Schema Definitions
 * Reference for all table structures in the Ticketing System
 */

// User Model
const UserSchema = {
  UserID: 'INT (Primary Key)',
  Name: 'VARCHAR(255)',
  Email: 'VARCHAR(255) (Unique)',
  Role: 'ENUM (Admin, Manager, Engineer, Client)',
  PasswordHash: 'VARCHAR(255)',
  Department: 'VARCHAR(255)',
  Phone: 'VARCHAR(20)',
  CreatedAt: 'DATETIME',
  UpdatedAt: 'DATETIME',
  IsDeleted: 'BOOLEAN (SOFT_DELETE)',
};

// Ticket Model
const TicketSchema = {
  TicketID: 'INT (Primary Key)',
  Title: 'VARCHAR(255)',
  Description: 'TEXT',
  Priority: 'ENUM (Low, Medium, High, Critical)',
  StatusID: 'INT (FK -> Status.StatusID)',
  CreatedBy: 'INT (FK -> Users.UserID)',
  AssignedTo: 'INT (FK -> Users.UserID)',
  ClientID: 'INT (FK -> Users.UserID)',
  CompanyID: 'INT (FK -> Company.CompanyID)',
  ProductID: 'INT (FK -> Products.ProductID)',
  CreatedAt: 'DATETIME',
  UpdatedAt: 'DATETIME',
  ResolvedAt: 'DATETIME',
  IsDeleted: 'BOOLEAN (SOFT_DELETE)',
};

// Company Model
const CompanySchema = {
  CompanyID: 'INT (Primary Key)',
  Name: 'VARCHAR(255)',
  Email: 'VARCHAR(255)',
  Phone: 'VARCHAR(20)',
  Address: 'TEXT',
  City: 'VARCHAR(100)',
  CreatedAt: 'DATETIME',
  UpdatedAt: 'DATETIME',
};

// Status Model
const StatusSchema = {
  StatusID: 'INT (Primary Key)',
  Name: 'VARCHAR(50) (Unique)',
  Description: 'VARCHAR(255)',
  CreatedAt: 'DATETIME',
};

// Product Model
const ProductSchema = {
  ProductID: 'INT (Primary Key)',
  Name: 'VARCHAR(255)',
  Description: 'TEXT',
  CompanyID: 'INT (FK -> Company.CompanyID)',
  CreatedAt: 'DATETIME',
  UpdatedAt: 'DATETIME',
};

// AuditLog Model
const AuditLogSchema = {
  id: 'INT (Primary Key)', 
  UserId: 'INT (FK -> Users.UserID)',
  Action: 'VARCHAR(100)',
  TicketID: 'INT (FK -> Tickets.TicketID)',
  OldValue: 'TEXT',
  NewValue: 'TEXT',
  CreatedAt: 'DATETIME',
};

// Comment Model
const CommentSchema = {
  CommentID: 'INT (Primary Key)',
  TicketID: 'INT (FK -> Tickets.TicketID)',
  AuthorID: 'INT (FK -> Users.UserID)',
  Content: 'TEXT',
  CreatedAt: 'DATETIME',
  UpdatedAt: 'DATETIME',
  IsDeleted: 'BOOLEAN (SOFT_DELETE)',
};

// CSAT Rating Model
const CSATSchema = {
  RatingID: 'INT (Primary Key)',
  TicketID: 'INT (FK -> Tickets.TicketID)',
  UserID: 'INT (FK -> Users.UserID)',
  Stars: 'INT (1-5)',
  Comment: 'TEXT',
  CreatedAt: 'DATETIME',
};

// Messages Model
const MessageSchema = {
  MessageID: 'INT (Primary Key)',
  TicketID: 'INT (FK -> Tickets.TicketID)',
  SenderId: 'INT (FK -> Users.UserID)',
  Content: 'TEXT',
  CreatedAt: 'DATETIME',
  IsDeleted: 'BOOLEAN (SOFT_DELETE)',
};

// Notifications Table
const NotificationSchema = {
  NotificationID: 'INT (Primary Key)',
  UserID: 'INT (FK -> Users.UserID)',
  TicketID: 'INT (FK -> Tickets.TicketID)',
  Type: 'VARCHAR(50)',
  IsRead: 'BOOLEAN',
  CreatedAt: 'DATETIME',
};

module.exports = {
  UserSchema,
  TicketSchema,
  CompanySchema,
  StatusSchema,
  ProductSchema,
  AuditLogSchema,
  CommentSchema,
  CSATSchema,
  MessageSchema,
  NotificationSchema,
};
