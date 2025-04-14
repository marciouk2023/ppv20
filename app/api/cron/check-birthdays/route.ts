// app/api/cron/check-birthdays/route.ts WITH DETAILED LOGS
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, where } from "firebase/firestore"
import { sendMessage } from "@/utils/message-sender" // Ensure path is correct

// (getUserBirthdayContacts function remains the same - no logs added here for brevity)
async function getUserBirthdayContacts(userEmail: string, currentDay: number, currentMonth: number) {
  const contactsRef = collection(db, `parabenspravoce/${userEmail}/users`)
  const snapshot = await getDocs(contactsRef)
  const birthdayContacts: Array<{ id: string; nome: string; telefone: string; data_de_nascimento: string }> = []
  snapshot.docs.forEach((doc) => {
    const contact = doc.data();
    if (!contact.data_de_nascimento || !contact.telefone) return;
    let birthDay: number | undefined, birthMonth: number | undefined;
    try {
      const dobString = String(contact.data_de_nascimento).trim();
      if (dobString.includes("/")) { const parts = dobString.split("/"); if (parts.length >= 2) { birthDay = parseInt(parts[0], 10); birthMonth = parseInt(parts[1], 10); } }
      else if (dobString.includes("-")) { const parts = dobString.split("-"); if (parts.length === 3) { birthMonth = parseInt(parts[1], 10); birthDay = parseInt(parts[2], 10); } else if (parts.length === 2) { birthMonth = parseInt(parts[0], 10); birthDay = parseInt(parts[1], 10); } }
      if (birthDay !== undefined && birthMonth !== undefined && !isNaN(birthDay) && !isNaN(birthMonth) && birthDay === currentDay && birthMonth === currentMonth) {
        birthdayContacts.push({ id: doc.id, nome: contact.nome || "Aniversariante", telefone: contact.telefone, data_de_nascimento: dobString });
      }
    } catch (e) { console.error(`[CRON_LOG] Error processing date '${contact.data_de_nascimento}' for contact ${doc.id} of user ${userEmail}:`, e instanceof Error ? e.message : e); }
  });
  return birthdayContacts;
}

// (getBirthdayMessages function remains the same - no logs added here for brevity)
async function getBirthdayMessages(userEmail: string): Promise<string[]> {
    try {
        const messagesRef = collection(db, `parabenspravoce/${userEmail}/templates`);
        const q = query(messagesRef, where("type", "==", "birthday"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { console.log(`[CRON_LOG] No birthday messages (type='birthday') found in /templates for ${userEmail}`); return []; }
        const messages = snapshot.docs.map((doc) => doc.data().content || doc.data().message || "").filter((msg): msg is string => typeof msg === 'string' && msg.trim() !== "");
        // console.log(`[CRON_LOG] Found ${messages.length} birthday messages in /templates for ${userEmail}`);
        return messages;
    } catch (error) { console.error(`[CRON_LOG] Error fetching messages from /templates for ${userEmail}:`, error); return []; }
}


export async function GET(request: Request) {
  console.log("==============================================");
  console.log("[CRON_LOG] GET request received for check-birthdays");
  const executionTime = new Date();
  console.log(`[CRON_LOG] Execution time: ${executionTime.toISOString()}`);

  // Security Check
  const authHeader = request.headers.get("Authorization");
  const expectedSecretValue = process.env.CRON_SECRET;
  if (!expectedSecretValue) { console.error("[CRON_LOG] CRON_SECRET missing!"); return NextResponse.json({ success: false, error: "Config missing" }, { status: 500 }); }
  const expectedAuth = `Bearer ${expectedSecretValue}`;
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  const isValidAuth = authHeader === expectedAuth;
  if (!isVercelCron && !isValidAuth) { console.warn(`[CRON_LOG] Unauthorized access attempt. Header: ${authHeader}`); return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); }
  const authMethod = isVercelCron ? "Vercel Cron" : "Header Authorization";
  console.log(`[CRON_LOG] Auth OK (${authMethod}). Starting check...`);

  // Time Calculation
  const currentHour = executionTime.getUTCHours();
  const currentMinute = executionTime.getUTCMinutes();
  const currentDay = executionTime.getUTCDate();
  const currentMonth = executionTime.getUTCMonth() + 1;
  console.log(`[CRON_LOG] Current UTC Time: <span class="math-inline">\{String\(currentHour\)\.padStart\(2, "0"\)\}\:</span>{String(currentMinute).padStart(2, "0")}. Date: <span class="math-inline">\{currentDay\}/</span>{currentMonth}`);

  const results: Array<{ user: string; contact?: string; status: string; error?: string; messageId?: string }> = []
  let totalMessagesAttempted = 0
  let totalMessagesSent = 0
  let usersProcessed = 0

  try {
    console.log("[CRON_LOG] Fetching user settings...");
    const userSettingsCollection = collection(db, "user_settings");
    const userSettingsSnapshot = await getDocs(userSettingsCollection);
    console.log(`[CRON_LOG] Found ${userSettingsSnapshot.docs.length} user settings documents.`);

    for (const userDoc of userSettingsSnapshot.docs) {
      usersProcessed++;
      const userEmail = userDoc.id;
      const userSettings = userDoc.data();
      const configuredTime = userSettings?.sendTime ?? "08:00";
      const sessionName = userSettings?.sessionName; // Get session name here

      console.log(`\n[CRON_LOG] Processing User ${usersProcessed}: ${userEmail}. Configured time: ${configuredTime}, SessionName: ${sessionName}`);

      if (!sessionName) {
        console.warn(`[CRON_LOG] Skipping user ${userEmail}: sessionName missing in user_settings.`);
        results.push({ user: userEmail, status: "error_config", error: "sessionName missing" });
        continue;
      }

      let configHour: number, configMinute: number;
      try {
        if (typeof configuredTime !== "string" || !configuredTime.includes(":")) throw new Error("Invalid time format");
        [configHour, configMinute] = configuredTime.split(":").map(Number);
        if (isNaN(configHour) || isNaN(configMinute)) throw new Error("Hour/Minute are not numbers");
      } catch (e) {
        console.error(`[CRON_LOG] Invalid time ('${configuredTime}') for ${userEmail}. Error:`, e instanceof Error ? e.message : e);
        results.push({ user: userEmail, status: "error_config", error: `Invalid time: ${configuredTime}` });
        continue;
      }

      // Exact Time Check
      const isTimeToSend = configHour === currentHour && configMinute === currentMinute;
      console.log(`[CRON_LOG] Time Check for ${userEmail}: (Config: <span class="math-inline">\{configHour\}\:</span>{configMinute} vs Current UTC: <span class="math-inline">\{currentHour\}\:</span>{currentMinute}) -> isTimeToSend: ${isTimeToSend}`);

      if (!isTimeToSend) {
        continue; // Skip user if time doesn't match
      }

      console.log(`[CRON_LOG] TIME MATCH for ${userEmail}! Fetching contacts...`);

      try {
        const birthdayContacts = await getUserBirthdayContacts(userEmail, currentDay, currentMonth);
        console.log(`[CRON_LOG] Found ${birthdayContacts.length} birthday contacts for ${userEmail}.`);

        if (birthdayContacts.length === 0) continue;

        console.log(`[CRON_LOG] Fetching messages for ${userEmail}...`);
        const birthdayMessages = await getBirthdayMessages(userEmail);
        console.log(`[CRON_LOG] Found ${birthdayMessages.length} message templates for ${userEmail}.`);

        if (birthdayMessages.length === 0) {
          results.push({ user: userEmail, status: "error_config", error: "No birthday messages configured" });
          continue;
        }

        // Send to each contact
        for (const contact of birthdayContacts) {
          console.log(`[CRON_LOG] ---- Preparing send for contact: ${contact.nome} (ID: ${contact.id}) ----`);
          totalMessagesAttempted++;
          const randomIndex = Math.floor(Math.random() * birthdayMessages.length);
          const messageTemplate = birthdayMessages[randomIndex];
          // Log which template ID was chosen IF the template objects have IDs
          // Assuming getBirthdayMessages was changed to return {id: string, content: string}[]
          // const templateId = birthdayMessages[randomIndex]?.id || 'unknown_template_id';
          // console.log(`[CRON_LOG] Selected random template index: ${randomIndex} (ID: ${templateId})`);
          console.log(`[CRON_LOG] Selected random template index: ${randomIndex}`); // Log index for now


          console.log(`[CRON_LOG] Calling sendMessage utility function...`);
          const sendResult = await sendMessage({
            userEmail,
            contactId: contact.id,
            contactName: contact.nome,
            contactPhone: contact.telefone,
            message: messageTemplate, // Passando o template content
            usePersonalization: true,
            messageType: "birthday",
            sessionName: sessionName // Pass the session name fetched from settings
            // templateId: templateId // Pass template ID if available/needed
          });
          // Log the stringified result to capture all details including potential error messages
          console.log(`[CRON_LOG] sendMessage result:`, JSON.stringify(sendResult, null, 2));

          if (sendResult.success) {
            if (!sendResult.duplicated) { totalMessagesSent++; console.log(`[CRON_LOG] ✅ SUCCESS (New Send) for ${contact.nome}. MsgID: ${sendResult.messageId}`); }
            else { console.log(`[CRON_LOG] ⏭️ SUCCESS (Duplicated) for ${contact.nome}. MsgID: ${sendResult.messageId}`); }
            results.push({ user: userEmail, contact: contact.nome, status: sendResult.duplicated ? "duplicated" : "success", messageId: sendResult.messageId });
          } else {
            results.push({ user: userEmail, contact: contact.nome, status: "error_send", error: sendResult.message, messageId: sendResult.messageId });
            console.error(`[CRON_LOG] ❌ ERROR SEND for ${contact.nome}: ${sendResult.message}. MsgID: ${sendResult.messageId}`);
          }
          console.log(`[CRON_LOG] ---- Finished send attempt for contact: ${contact.nome} ----`);
          // Optional pause: await new Promise(resolve => setTimeout(resolve, 200));
        } // End contact loop

      } catch (userError) {
        console.error(`[CRON_LOG] Error processing user ${userEmail} after time match:`, userError);
        results.push({ user: userEmail, status: "error_user_processing", error: userError instanceof Error ? userError.message : String(userError) });
      }
    } // End user loop

    console.log(`[CRON_LOG] Check finished. Processed: ${usersProcessed}. Attempted: ${totalMessagesAttempted}. Sent New: ${totalMessagesSent}.`);
    console.log("==============================================");
    return NextResponse.json({
      success: true,
      timestamp: executionTime.toISOString(),
      checkedUsers: usersProcessed,
      messagesAttempted: totalMessagesAttempted,
      messagesSent: totalMessagesSent, // Mensagens realmente enviadas (não duplicadas)
      details: results,
    })

  } catch (error) {
    console.error("[CRON_LOG] GENERAL CRON ERROR:", error);
    console.log("==============================================");
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error), timestamp: executionTime.toISOString() },
      { status: 500 }
    )
  }
}
