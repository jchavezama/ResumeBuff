import { Client, Storage, Databases, Account, ID } from 'appwrite';

const client = new Client()
    .setEndpoint('https://sfo.cloud.appwrite.io/v1') 
    .setProject('6ab3ff330016ce2b4f14');        

export const storage = new Storage(client);
export const databases = new Databases(client);
export const account = new Account(client);
export { ID };