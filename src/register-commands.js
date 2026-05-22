// src/register-commands.js
// Run once: node src/register-commands.js
// Registers slash commands with Discord (guild-scoped for instant updates)

require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash commands...");

    const route = process.env.DISCORD_GUILD_ID
      ? Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID,
          process.env.DISCORD_GUILD_ID
        )
      : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

    await rest.put(route, { body: commands });

    console.log("✅ Slash commands registered successfully!");
    console.log(
      process.env.DISCORD_GUILD_ID
        ? `   Scope: Guild ${process.env.DISCORD_GUILD_ID} (instant)`
        : "   Scope: Global (may take up to 1 hour to propagate)"
    );
  } catch (err) {
    console.error("❌ Registration failed:", err);
  }
})();
