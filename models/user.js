const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    employee_id: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      require: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    trip_template: {
      type: String,
      required: true,
    },
    role: {
      type: String,
    },
    profile: {
      type: String,
    },
    license_exp: {
      type: Date,
    },
    status: {
      type: String,
    },
    department: {
      type: Object,
    },
    sub_unit: {
      type: Object,
    },
    location: {
      type: Object,
    },
    division: {
      type: Object,
    },
    division_category: {
      type: Object,
    },
    company: {
      type: Object,
    },
    mobile_number: {
      type: String,
      validate: {
        validator: function (value) {
          // Use a regular expression to check if the mobile number starts with +63 and has exactly 13 characters
          return /^(\+63)[0-9]{10}$/.test(value);
        },
        message: props =>
          `${props.value} is not a valid mobile number. It should start with +63 and have 12 characters.`,
      },
    },
    permission: {
      type: JSON,
    },
    show_all_departments: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
