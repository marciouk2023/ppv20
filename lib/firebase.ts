import { initializeApp } from "firebase/app"
import { getStorage } from "firebase/storage"
import { getAuth, signInAnonymously } from "firebase/auth"

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAhVRy9BU62M6kpB_y9NoQqaU_y-AePG3A",
  authDomain: "mmlj---new-day-church.firebaseapp.com",
  projectId: "mmlj---new-day-church",
  storageBucket: "mmlj---new-day-church.appspot.com", // Corrigido para o domínio correto
  messagingSenderId: "1018979121797",
  appId: "1:1018979121797:web:ef5de75f9a6d46cfda07ec",
  measurementId: "G-5DK2QQ0RMH",
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const storage = getStorage(app)
const auth = getAuth(app)

// Função para autenticar anonimamente
const authenticateAnonymously = async () => {
  try {
    const userCredential = await signInAnonymously(auth)
    console.log("Autenticado anonimamente com sucesso:", userCredential.user.uid)
    return userCredential.user
  } catch (error) {
    console.error("Erro na autenticação anônima:", error)
    throw error
  }
}

export { app, storage, auth, authenticateAnonymously }
