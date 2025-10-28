import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// As suas chaves de configuração do Firebase que pegamos no console.
const firebaseConfig = {
    apiKey: "AIzaSyCyAPsZqtVcroxKowyxnRq5p7nM8IoHwnE",
    authDomain: "trilha-digital-aeea4.firebaseapp.com",
    projectId: "trilha-digital-aeea4",
    storageBucket: "trilha-digital-aeea4.firebasestorage.app",
    messagingSenderId: "405742280196",
    appId: "1:405742280196:web:0905a2b18bfe6b18445f51"
};

// Inicializa o app do Firebase com as configurações acima.
const app = initializeApp(firebaseConfig);

// Cria e exporta as instâncias dos serviços que vamos usar na aplicação.
// Agora, em vez de inicializar o app em vários lugares,
// apenas importaremos 'auth' e 'db' deste arquivo.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = firebaseConfig.appId;

