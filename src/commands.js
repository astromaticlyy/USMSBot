// src/commands.js
// Defines all slash commands

const { SlashCommandBuilder } = require("discord.js");

module.exports = [
  // ── /adduser ──────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("adduser")
    .setDescription("Add a Discord user to the Google Sheet")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to add").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("role")
        .setDescription("Role to assign (default: Member)")
        .setRequired(false)
        .addChoices(
          { name: "Admin",     value: "Admin" },
          { name: "Moderator", value: "Moderator" },
          { name: "Member",    value: "Member" },
          { name: "Guest",     value: "Guest" }
        )
    ),

  // ── /removeuser ───────────────────────────────────────
  new SlashCommandBuilder()
    .setName("removeuser")
    .setDescription("Remove a user from the Google Sheet")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to remove").setRequired(true)
    ),

  // ── /attended ─────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("attended")
    .setDescription("Toggle the Attended checkbox for a user")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user").setRequired(true)
    ),

  // ── /taskdone ─────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("taskdone")
    .setDescription("Toggle the Task Done checkbox for a user")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user").setRequired(true)
    ),

  // ── /setrole ──────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("setrole")
    .setDescription("Update a user's role in the Google Sheet")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("role")
        .setDescription("New role")
        .setRequired(true)
        .addChoices(
          { name: "Admin",     value: "Admin" },
          { name: "Moderator", value: "Moderator" },
          { name: "Member",    value: "Member" },
          { name: "Guest",     value: "Guest" }
        )
    ),

  // ── /listusers ────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("listusers")
    .setDescription("Show all users and their status from the Google Sheet"),
].map((cmd) => cmd.toJSON());
