// utils/message-sender.ts WITH DETAILED LOGS
import { db } from "@/lib/firebase-config";
import { collection, query, where, getDocs, addDoc, Timestamp, runTransaction, doc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
// Assuming personalizeMessage exists and works correctly
import { personalizeMessage } from "@/utils/message-utils"; // Ensure path is correct
import https from "https"; // Import https for agent if needed

interface SendMessageOptions {
  phoneNumber: string;
  message: string;
  sessionName?: string; // Make optional as it might be missing from settings
  contactId?: string;
  contactName?: string;
  userEmail: string;
  usePersonalization?: boolean;
  messageType?: string;
  // templateId?: string; // Optional: If you pass template ID from cron
}

interface SendMessageResult {
  success: boolean;
  message: string;
  duplicated?: boolean;
  messageId?: string; // Should always be set on success/duplicate
  data?: any;
  error?: string; // Added for consistency
}

export async function sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const functionStartTime = Date.now();
  console.log(`\n--- [sendMessage_LOG] Start processing at ${new Date(functionStartTime).toISOString()} ---`);
  console.log(`[sendMessage_LOG] Received options: ${JSON.stringify(options)}`);

  const {
    phoneNumber,
    message,
    sessionName, // Might be undefined if not passed from cron/caller
    contactId,
    contactName,
    userEmail,
    usePersonalization = true,
    messageType = "direct",
    // templateId // Optional: capture template ID if passed
  } = options;

  // ** Input Validation **
  if (!phoneNumber || !message || !sessionName || !userEmail) {
    const errorMsg = `[sendMessage_LOG] ERROR: Missing required parameters. Phone: ${!!phoneNumber}, Msg: ${!!message}, Session: ${!!sessionName}, Email: ${!!userEmail}`;
    console.error(errorMsg);
    return { success: false, message: "Parâmetros obrigatórios faltando (ver logs do servidor)." };
  }

  // ** Generate Message ID **
  const dateStr = new Date().toISOString().split("T")[0];
  const identifier = contactId || phoneNumber.replace(/\D/g, '');
  const messageId = `<span class="math-inline">\{messageType\}\_</span>{userEmail}_${identifier}_${dateStr}`;
  console.log(`[sendMessage_LOG] Generated messageId: ${messageId}`);

  try {
    // ** Firestore Transaction for Deduplication and Sending **
    console.log(`[sendMessage_LOG] Starting Firestore transaction for messageId: ${messageId}`);
    const result = await runTransaction(db, async (transaction) => {
      const sentMessageDocRef = doc(db, "sent_messages", messageId); // Use messageId as Document ID for easier lookup

      // ** Step 1: Check for duplicate WITHIN transaction **
      console.log(`[sendMessage_LOG] Transaction: Checking duplicate for ${messageId}`);
      const docSnap = await transaction.get(sentMessageDocRef);
      if (docSnap.exists() && docSnap.data()?.status !== 'failed') { // Check if exists and wasn't marked as failed previously
          console.warn(`[sendMessage_LOG] Transaction: Duplicate found (status: ${docSnap.data()?.status}) for ${messageId}. Aborting.`);
          return { success: true, message: "Mensagem já enviada ou processando (detectado na transação)", duplicated: true, messageId: messageId, source: "transaction_check" };
      }
      console.log(`[sendMessage_LOG] Transaction: No active duplicate found for ${messageId}.`);

      // ** Step 2: Record message as 'sending' (or update if retrying failed one) **
      console.log(`[sendMessage_LOG] Transaction: Recording/Updating ${messageId} as 'sending'`);
      transaction.set(sentMessageDocRef, { // Use set with merge=true or handle update explicitly if needed
        messageId,
        phoneNumber,
        contactId,
        contactName,
        userEmail,
        message: message.substring(0, 100) + (message.length > 100 ? "..." : ""), // Store original template before personalization
        // personalizedMessage: finalMessage.substring(0, 100) + (finalMessage.length > 100 ? "..." : ""), // Optional: Store personalized too
        timestamp: Timestamp.now(), // Record time initiated
        status: "sending", // Initial status
        type: messageType,
        sessionName: sessionName,
        // templateId: templateId || null, // Store template ID if passed
        lastAttemptAt: Timestamp.now(), // Track attempt time
      }, { merge: true }); // Use merge to handle potential retries of failed attempts

      // ** Step 3: Personalize Message (Do AFTER recording original message) **
       let finalMessage = message;
       if (usePersonalization && contactName) {
         console.log(`[sendMessage_LOG] Transaction: Personalizing message for: ${contactName}`);
         finalMessage = personalizeMessage(message, contactName, true); // Assuming personalizeMessage works
         console.log(`[sendMessage_LOG] Transaction: Personalized message: "${finalMessage.substring(0, 50)}..."`);
       } else {
          console.log(`[sendMessage_LOG] Transaction: Personalization skipped.`);
       }


      // ** Step 4: Format Phone Number (chatId) **
      let chatId = phoneNumber.replace(/\D/g, "");
      if (!chatId.endsWith("@c.us")) {
        chatId = `${chatId}@c.us`;
      }
      console.log(`[sendMessage_LOG] Transaction: Formatted chatId: ${chatId}`);

      // ** Step 5: Prepare WAHA Request **
      const wahaApiUrl = process.env.WAHA_API_URL || "https://api.parabenspravoce.com";
      const wahaApiKey = process.env.WAHA_API_KEY;
      if (!wahaApiKey) throw new Error("WAHA_API_KEY environment variable not set!"); // Throw inside transaction

      const wahaEndpoint = `${wahaApiUrl}/api/sendText`;
      const requestBody = { chatId, text: finalMessage, session: sessionName };
      const headers = { "Content-Type": "application/json", "Accept": "application/json", "X-Api-Key": wahaApiKey };
      console.log(`[sendMessage_LOG] Transaction: Prepared WAHA Request - Endpoint: ${wahaEndpoint}, Session: ${sessionName}`);

      // ** Step 6: Call WAHA API **
      console.log(`[sendMessage_LOG] Transaction: Calling WAHA API...`);
      let responseStatus = 0;
      let responseText = '';
      let responseData = {};
      try {
          const response = await fetch(wahaEndpoint, {
              method: "POST",
              headers: headers,
              body: JSON.stringify(requestBody),
              // agent: new https.Agent({ rejectUnauthorized: false }) // Add if needed for self-signed certs
          });
          responseStatus = response.status;
          responseText = await response.text();
          try { responseData = JSON.parse(responseText); } catch (e) { responseData = { raw: responseText }; }
          console.log(`[sendMessage_LOG] Transaction: WAHA API Response Status: ${responseStatus}`);
      } catch (fetchError) {
          console.error(`[sendMessage_LOG] Transaction: Network Error calling WAHA API for ${messageId}:`, fetchError);
          // Record network error and throw to rollback transaction
           transaction.update(sentMessageDocRef, {
             status: "failed",
             error: `Network Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
             updatedAt: Timestamp.now(),
           });
           throw fetchError; // Rollback transaction
      }


      // ** Step 7: Handle WAHA Response (Update Firestore) **
      if (responseStatus < 200 || responseStatus >= 300) { // Check if status is not 2xx
        console.error(`[sendMessage_LOG] Transaction: WAHA API Error (${responseStatus}) for ${messageId}. Updating status to 'failed'.`);
        transaction.update(sentMessageDocRef, {
          status: "failed",
          error: responseText.substring(0, 500),
          wahaStatus: responseStatus,
          updatedAt: Timestamp.now(),
        });
        // Throw an error to rollback transaction (or return specific failure object if needed)
        // throw new Error(`WAHA Error ${responseStatus}`);
         return {
            success: false,
            message: `Erro da API WAHA (${responseStatus})`,
            error: responseText.substring(0, 500),
            messageId,
         };
      } else {
        console.log(`[sendMessage_LOG] Transaction: WAHA API Success (${responseStatus}) for ${messageId}. Updating status to 'sent'.`);
        transaction.update(sentMessageDocRef, {
          status: "sent",
          response: responseData,
          wahaStatus: responseStatus,
          error: null, // Clear previous error if any
          updatedAt: Timestamp.now(),
        });

        // ** Step 8: Update Contact's Last Sent (Optional) **
        if (contactId && userEmail) {
          console.log(`[sendMessage_LOG] Transaction: Updating contact ${contactId} last message sent time.`);
          const contactRef = doc(db, `parabenspravoce/${userEmail}/users`, contactId);
          transaction.update(contactRef, {
            lastMessageSent: Timestamp.now(),
            lastMessageContent: finalMessage.substring(0, 100) + (finalMessage.length > 100 ? "..." : ""),
          });
        }
        console.log(`[sendMessage_LOG] Transaction: Commit success path for ${messageId}`);
        return { success: true, message: "Mensagem enviada com sucesso", data: responseData, messageId };
      }
    }); // End of Firestore Transaction

    // Handle results from transaction
    console.log(`[sendMessage_LOG] Firestore transaction completed. Raw result: ${JSON.stringify(result)}`);
    if(result && result.success) {
         if(result.duplicated) {
              console.log(`--- [sendMessage_LOG] Finished processing (DUPLICATE in TX) in ${Date.now() - functionStartTime}ms ---`);
         } else {
              console.log(`--- [sendMessage_LOG] Finished processing (SUCCESS) in ${Date.now() - functionStartTime}ms ---`);
         }
    } else {
         console.log(`--- [sendMessage_LOG] Finished processing (FAILED in TX) in ${Date.now() - functionStartTime}ms ---`);
    }
    return result as SendMessageResult; // Return result object from transaction


  } catch (error) {
    console.error(`[sendMessage_LOG] GENERAL ERROR for messageId ${messageId} (maybe transaction error):`, error);
    console.log(`--- [sendMessage_LOG] Finished processing (GENERAL ERROR) in ${Date.now() - functionStartTime}ms ---`);
    return {
      success: false,
      message: `Erro ao processar envio: ${error instanceof Error ? error.message : String(error)}`,
      messageId: messageId,
    };
  }
}

// (sendAudioMessage function - keep existing or update with logs if needed)
export async function sendAudioMessage( phoneNumber: string, audioUrl: string, sessionName: string, userEmail: string ): Promise<SendMessageResult> {
   console.warn("[sendMessage_LOG] sendAudioMessage called - logging not fully implemented here yet.");
   return { success: false, message: "sendAudioMessage not fully implemented with logging." };
}
