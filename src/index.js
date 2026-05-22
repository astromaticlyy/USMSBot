// src/index.js
// Main bot entry point — handles all slash commands and button interactions

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const sheets = require("./sheets");

// ── Client setup ──────────────────────────────────────────────────────────────

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity("Google Sheets 📊");
});

// ── Interaction router ────────────────────────────────────────────────────────

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (err) {
    console.error("Interaction error:", err);
    const payload = { content: "⚠️ Something went wrong. Check the bot logs.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

// ── Slash command handlers ────────────────────────────────────────────────────

async function handleSlashCommand(interaction) {
  await interaction.deferReply();

  const { commandName } = interaction;

  // /adduser
  if (commandName === "adduser") {
    const user = interaction.options.getUser("user");
    const role = interaction.options.getString("role") || "Member";
    const result = await sheets.addUser(user.username, role);
    await interaction.editReply({ content: result.message });
    return;
  }

  // /removeuser
  if (commandName === "removeuser") {
    const user = interaction.options.getUser("user");

    // Show a confirmation button before deleting
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_remove:${user.username}`)
        .setLabel("Yes, remove them")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      content: `⚠️ Are you sure you want to remove **${user.username}** from the sheet?`,
      components: [row],
    });
    return;
  }

  // /attended
  if (commandName === "attended") {
    const user = interaction.options.getUser("user");
    const result = await sheets.toggleCheckbox(user.username, "ATTENDED");
    await interaction.editReply({ content: result.message });
    return;
  }

  // /taskdone
  if (commandName === "taskdone") {
    const user = interaction.options.getUser("user");
    const result = await sheets.toggleCheckbox(user.username, "TASK_DONE");
    await interaction.editReply({ content: result.message });
    return;
  }

  // /setrole
  if (commandName === "setrole") {
    const user = interaction.options.getUser("user");
    const role = interaction.options.getString("role");
    const result = await sheets.setRole(user.username, role);
    await interaction.editReply({ content: result.message });
    return;
  }

  // /listusers
  if (commandName === "listusers") {
    const users = await sheets.listUsers();

    if (users.length === 0) {
      await interaction.editReply({ content: "📋 The sheet is empty." });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📊 Google Sheet — User List")
      .setColor(0x5865f2)
      .setTimestamp();

    // Split into chunks of 20 to avoid embed field limits
    const chunks = chunkArray(users, 20);
    for (const chunk of chunks.slice(0, 5)) {
      const lines = chunk.map((u) => {
        const attended = u.attended ? "✅" : "☐";
        const task     = u.taskDone ? "✅" : "☐";
        return `**${u.username}** — ${u.role} | Attended: ${attended} | Task: ${task}`;
      });
      embed.addFields({ name: "\u200b", value: lines.join("\n") });
    }

    embed.setFooter({ text: `${users.length} user(s) total` });

    // Action buttons for quick access
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_refresh_list")
        .setLabel("🔄 Refresh")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }
}

// ── Button handlers ───────────────────────────────────────────────────────────

async function handleButton(interaction) {
  const { customId } = interaction;

  // Confirm remove user
  if (customId.startsWith("confirm_remove:")) {
    await interaction.deferUpdate();
    const username = customId.split(":")[1];
    const result   = await sheets.removeUser(username);
    await interaction.editReply({ content: result.message, components: [] });
    return;
  }

  // Cancel any action
  if (customId === "cancel") {
    await interaction.update({ content: "❌ Action cancelled.", components: [] });
    return;
  }

  // Refresh the user list
  if (customId === "btn_refresh_list") {
    await interaction.deferUpdate();
    const users = await sheets.listUsers();

    const embed = new EmbedBuilder()
      .setTitle("📊 Google Sheet — User List")
      .setColor(0x5865f2)
      .setTimestamp()
      .setFooter({ text: `${users.length} user(s) total` });

    const chunks = chunkArray(users, 20);
    for (const chunk of chunks.slice(0, 5)) {
      const lines = chunk.map((u) => {
        const attended = u.attended ? "✅" : "☐";
        const task     = u.taskDone ? "✅" : "☐";
        return `**${u.username}** — ${u.role} | Attended: ${attended} | Task: ${task}`;
      });
      embed.addFields({ name: "\u200b", value: lines.join("\n") });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_refresh_list")
        .setLabel("🔄 Refresh")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ── Start ─────────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);
