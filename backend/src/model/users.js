import { DataTypes } from "sequelize";
import {sequelize} from "sequelize";
console.log("USER MODEL FILE:", import.meta.url);

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },

    birthOfDay: {
      type: DataTypes.DATEONLY
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    phoneNumber: {
      type: DataTypes.STRING
    },

    gender: {
      type: DataTypes.STRING
    },

    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    point: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    status: {
      type: DataTypes.STRING
    },

    login_time: {
      type: DataTypes.DATE
    },

    logout_time: {
      type: DataTypes.DATE
    }
  },
  {
    tableName: "users",
    timestamps: false
  }
);

export default User;
