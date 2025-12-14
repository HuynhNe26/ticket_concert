import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Member = sequelize.define(
  "Member",
  {
    member_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    name: DataTypes.STRING
  },
  {
    tableName: "members",
    timestamps: false
  }
);

export default Member;
