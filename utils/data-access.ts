import { collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

// Admin user constants
const ADMIN_EMAIL = "ronaldo@graficaeleal.com.br"
const ADMIN_USER_ID = "ronaldo-leal-admin"

/**
 * Utility function to get the correct user ID for data access
 * @param userId Current user's ID
 * @param userEmail Current user's email
 * @returns The correct user ID for data access
 */
export function getDataUserId(userId: string, userEmail: string): string {
  // If the user is Ronaldo (admin), use the fixed admin ID
  if (userEmail === ADMIN_EMAIL) {
    return ADMIN_USER_ID
  }

  // Otherwise, use the user's own ID
  return userId
}

/**
 * Get user contacts with proper isolation
 * @param userId Current user's ID
 * @param userEmail Current user's email
 * @returns Array of user contacts
 */
export async function getUserContacts(userId: string, userEmail: string) {
  try {
    const dataUserId = getDataUserId(userId, userEmail)

    // Get contacts from the user's subcollection
    const contactsRef = collection(db, "users", dataUserId, "contacts")
    const contactsSnapshot = await getDocs(contactsRef)

    return contactsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting user contacts:", error)
    throw error
  }
}

/**
 * Get user messages with proper isolation
 * @param userId Current user's ID
 * @param userEmail Current user's email
 * @returns Array of user messages
 */
export async function getUserMessages(userId: string, userEmail: string) {
  try {
    const dataUserId = getDataUserId(userId, userEmail)

    // Get messages from the user's subcollection
    const messagesRef = collection(db, "users", dataUserId, "messages")
    const messagesSnapshot = await getDocs(messagesRef)

    return messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting user messages:", error)
    throw error
  }
}

/**
 * Add a new contact with proper user isolation
 * @param userId Current user's ID
 * @param userEmail Current user's email
 * @param contactData Contact data to add
 * @returns ID of the newly created contact
 */
export async function addUserContact(userId: string, userEmail: string, contactData: any) {
  try {
    const dataUserId = getDataUserId(userId, userEmail)

    // Add contact to the user's subcollection
    const contactsRef = collection(db, "users", dataUserId, "contacts")
    const newContactRef = await addDoc(contactsRef, {
      ...contactData,
      createdAt: new Date(),
    })

    return newContactRef.id
  } catch (error) {
    console.error("Error adding user contact:", error)
    throw error
  }
}

/**
 * Add a new message with proper user isolation
 * @param userId Current user's ID
 * @param userEmail Current user's email
 * @param messageData Message data to add
 * @returns ID of the newly created message
 */
export async function addUserMessage(userId: string, userEmail: string, messageData: any) {
  try {
    const dataUserId = getDataUserId(userId, userEmail)

    // Add message to the user's subcollection
    const messagesRef = collection(db, "users", dataUserId, "messages")
    const newMessageRef = await addDoc(messagesRef, {
      ...messageData,
      createdAt: new Date(),
    })

    return newMessageRef.id
  } catch (error) {
    console.error("Error adding user message:", error)
    throw error
  }
}

/**
 * Check if the current user is the admin (Ronaldo)
 * @param userEmail Current user's email
 * @returns Boolean indicating if the user is admin
 */
export function isAdminUser(userEmail: string): boolean {
  return userEmail === ADMIN_EMAIL
}

/**
 * Migrate existing data to Ronaldo's account
 * This should be run once to ensure all existing data belongs to Ronaldo
 */
export async function migrateExistingDataToAdmin() {
  try {
    // Check if migration has already been done
    const adminDocRef = doc(db, "users", ADMIN_USER_ID)
    const adminDoc = await getDoc(adminDocRef)

    if (adminDoc.exists() && adminDoc.data().dataMigrated) {
      console.log("Data already migrated to admin account")
      return
    }

    // Get all existing contacts from the old structure
    const oldContactsRef = collection(db, "batista-agape-ronaldo", "dados", "usuarios")
    const oldContactsSnapshot = await getDocs(oldContactsRef)

    if (oldContactsSnapshot.empty) {
      console.log("No existing contacts to migrate")
      return
    }

    // Create admin user if it doesn't exist
    if (!adminDoc.exists()) {
      await setDoc(adminDocRef, {
        name: "Ronaldo Leal",
        email: ADMIN_EMAIL,
        whatsapp: "+5511987654321",
        isAdmin: true,
        churchName: "Igreja Batista Ágape",
        createdAt: new Date(),
        dataMigrated: true,
      })
    } else {
      // Mark as migrated
      await updateDoc(adminDocRef, { dataMigrated: true })
    }

    // Create contacts collection for admin
    const adminContactsRef = collection(db, "users", ADMIN_USER_ID, "contacts")

    // Migrate each contact
    for (const doc of oldContactsSnapshot.docs) {
      const contactData = doc.data()

      await addDoc(adminContactsRef, {
        nome: contactData.nome,
        telefone: contactData.telefone || contactData.celular || "",
        email: contactData.email || "",
        grupo: contactData.grupo || "Igreja",
        dataNascimento: contactData.dataNascimento || null,
        avatar: contactData.nome ? contactData.nome.charAt(0).toUpperCase() : "R",
        createdAt: new Date(),
      })
    }

    // Create default messages for admin
    const adminMessagesRef = collection(db, "users", ADMIN_USER_ID, "messages")

    const defaultMessages = [
      {
        title: "Mensagem de Aniversário 1",
        content: "Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida.",
        type: "birthday",
      },
      {
        title: "Mensagem de Aniversário 2",
        content:
          "Parabéns pelo seu dia! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
        type: "birthday",
      },
      {
        title: "Mensagem de Aniversário 3",
        content:
          "Felicitações pelo seu aniversário! Que este novo ciclo seja marcado por bênçãos e realizações. Estamos orando por você!",
        type: "birthday",
      },
    ]

    for (const message of defaultMessages) {
      await addDoc(adminMessagesRef, {
        ...message,
        createdAt: new Date(),
      })
    }

    console.log("Data migration to admin account completed successfully")
  } catch (error) {
    console.error("Error migrating data to admin account:", error)
    throw error
  }
}
