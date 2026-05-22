// src/sheets.js
// Handles all Google Sheets read/write operations

const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Column layout — adjust indexes if your sheet differs
// A=0  B=1  C=2  D=3 …
const COL = {
  USERNAME:  0,   // A  — Discord username (text)
  ATTENDED:  1,   // B  — Attended (checkbox → TRUE/FALSE)
  TASK_DONE: 2,   // C  — Task Done (checkbox → TRUE/FALSE)
  ROLE:      3,   // D  — Role (text, e.g. "Admin", "Member")
};

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    SCOPES
  );
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = () => process.env.SPREADSHEET_ID;
const SHEET_NAME     = () => process.env.SHEET_NAME || "Sheet1";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch all rows (skips the header row). */
async function getAllRows() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME()}!A2:Z`,
  });
  return res.data.values || [];
}

/** Find the 1-based row number of a username (case-insensitive). Returns null if not found. */
async function findUserRow(username) {
  const rows = await getAllRows();
  const idx  = rows.findIndex(
    (r) => (r[COL.USERNAME] || "").toLowerCase() === username.toLowerCase()
  );
  return idx === -1 ? null : idx + 2; // +2 because we start at row 2
}

/** Write a single cell. address example: "B5" */
async function writeCell(address, value) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME()}!${address}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

/** Write a full row starting from column A. */
async function writeRow(rowNumber, values) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME()}!A${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

/** Append a new row at the bottom. */
async function appendRow(values) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME()}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add a new user row.
 * Returns { success, message }
 */
async function addUser(username, role = "Member") {
  const existing = await findUserRow(username);
  if (existing) {
    return { success: false, message: `**${username}** is already in the sheet (row ${existing}).` };
  }
  await appendRow([username, "FALSE", "FALSE", role]);
  return { success: true, message: `✅ Added **${username}** with role **${role}**.` };
}

/**
 * Toggle a checkbox column for a user.
 * column: "ATTENDED" | "TASK_DONE"
 * Returns { success, message, newValue }
 */
async function toggleCheckbox(username, column) {
  const colIndex = COL[column];
  const colLetter = String.fromCharCode(65 + colIndex); // A=65

  const rowNum = await findUserRow(username);
  if (!rowNum) {
    return { success: false, message: `❌ User **${username}** not found in the sheet.` };
  }

  const rows       = await getAllRows();
  const row        = rows[rowNum - 2];
  const current    = (row[colIndex] || "FALSE").toUpperCase() === "TRUE";
  const newValue   = !current;
  const label      = column === "ATTENDED" ? "Attended" : "Task Done";

  await writeCell(`${colLetter}${rowNum}`, newValue ? "TRUE" : "FALSE");

  return {
    success: true,
    newValue,
    message: `${newValue ? "✅" : "☑️"} **${username}** — **${label}** set to \`${newValue}\`.`,
  };
}

/**
 * Set (or update) the role for a user.
 * Returns { success, message }
 */
async function setRole(username, role) {
  const rowNum = await findUserRow(username);
  if (!rowNum) {
    return { success: false, message: `❌ User **${username}** not found in the sheet.` };
  }

  const colLetter = String.fromCharCode(65 + COL.ROLE);
  await writeCell(`${colLetter}${rowNum}`, role);
  return { success: true, message: `🎖️ Set role for **${username}** to **${role}**.` };
}

/**
 * Get a summary of all users.
 * Returns array of { username, attended, taskDone, role }
 */
async function listUsers() {
  const rows = await getAllRows();
  return rows
    .filter((r) => r[COL.USERNAME])
    .map((r) => ({
      username: r[COL.USERNAME]  || "",
      attended: (r[COL.ATTENDED]  || "FALSE").toUpperCase() === "TRUE",
      taskDone: (r[COL.TASK_DONE] || "FALSE").toUpperCase() === "TRUE",
      role:     r[COL.ROLE]      || "—",
    }));
}

/**
 * Remove a user row by shifting everything up.
 * Returns { success, message }
 */
async function removeUser(username) {
  const sheets = getSheets();
  const rowNum = await findUserRow(username);
  if (!rowNum) {
    return { success: false, message: `❌ User **${username}** not found in the sheet.` };
  }

  // Get sheet ID (needed for deleteRange)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID() });
  const sheet = meta.data.sheets.find(
    (s) => s.properties.title === SHEET_NAME()
  );
  if (!sheet) {
    return { success: false, message: `❌ Sheet tab "${SHEET_NAME()}" not found.` };
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId:   sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowNum - 1, // 0-based
              endIndex:   rowNum,
            },
          },
        },
      ],
    },
  });

  return { success: true, message: `🗑️ Removed **${username}** from the sheet.` };
}

module.exports = { addUser, toggleCheckbox, setRole, listUsers, removeUser };
