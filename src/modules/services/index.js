import dotenv from "dotenv";
import { logs } from "../utils/index.js";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 3000;

dotenv.config();
// ENVIROMENT VARIABLES

// MAX RETRIES AT REQUESTS
const MAX_RETRIES = 500;

// MAX TIME OF RETURN RESPONSE AT REQUESTS
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000);

const accountID = process.env.ACCOUNT_ID;
const endPointInstance = process.env.ENDPOINT_INSTANCE;

/**
 * @async
 * @function createFolderAtCLM
 * @description CREATE FOLDER AT CLM WITH FOLDER NAME (LOCAL DOCUMENTS)
 * @param {string} directory - Name of the folder to be created.
 * @param {string} folderPath - Full path of the folder in the local file system.
 * @param {string} token - Authentication token.
 * @param {string} fatherFolderID - ID of the parent folder in CLM.
 * @param {string} company - Company name used to determine the specific CLM folder ID.
 * @returns {string} - ID of the created folder in CLM.
 * @throws {Error} - Throws an error if the maximum number of folder creation retries is reached.
 * @example const folderID = await createFolderAtCLM('clientes', './src/Files/clientes', 'token123', 'parentFolder789', 'SURF  TELECOM S.A');
 */
export const createFolderAtCLM = async (
  directory,
  folderPath,
  token,
  fatherFolderID
) => {
  const url = `https://api${endPointInstance}.springcm.com/v2/${accountID}/folders`;
  let retries = 0;
  let folderID;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      Name: directory,
      ParentFolder: {
        Href: `https://api${endPointInstance}.springcm.com/v2/${accountID}/folders/${fatherFolderID}`,
      },
    }),
  };
  while (retries < MAX_RETRIES) {
    try {
      // GET FOLDER BY PATH
      // fetch === se existir return ID and END
      const { status, documentID } = await getFolderByPath(directory, token);
      // REQ GET FOLDER BY Path status code
      if (status === 200) {
        return documentID;
      }

      if (status !== 200) {
        const response = await fetch(url, options);

        if (response.status == 201) {
          let { Href } = await response.json();
          Href = Href.split("/");
          const documentID = Href[Href.length - 1];
          console.log(
            `Sucesso ao criar a pasta. Status: ${response.status}, Nome: ${directory}\n`
          );
          return documentID;
        } else {
          const delay = Math.pow(2, retries) * 3000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          console.log(
            `Tentando novamente. Status: ${response.status}, Nome: ${directory}\n`
          );
          console.log(`Tentativa: ${retries + 1}`);
          retries++;

          if (retries === MAX_RETRIES) {
            throw new Error(
              "Número máximo de retentativas atingido no createFolder"
            );
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("A solicitação excedeu o tempo limite.");
      } else {
        console.log("ERROR AT REQUEST: ", error);
        retries++;
        logs(
          "createFolderError.txt",
          `PATH:${folderPath}\nERROR:${error}\nAttempt: ${retries}\n`
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return folderID;
};

/**
 * @async
 * @function getFolderByPath
 * @description GET FOLDER AT CLM WITH STRING PATH
 * @param {string} company - Name of the company associated with the folder.
 * @param {string} contratante - Name of the contratante associated with the folder.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - An object containing the status and documentID of the retrieved folder.
 * @throws {Error} - Throws an error if there is an issue with the fetch request.
 * @example const folderInfo = await getFolderByPath('CompanyA', 'ClientB', 'token123');
 */
export const getFolderByPath = async (directory, token) => {
  const pathCLM = process.env.URI_PATH_CLM;
  const options = {
    method: "GET",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  const pathURI = encodeURIComponent(`${pathCLM}/${directory}`);
  const url = `https://api${endPointInstance}.springcm.com/v2/${accountID}/folders/path?path=${pathURI}`;

  try {
    const response = await fetch(url, options);

    if (response.status === 200) {
      let { Href } = await response.json();
      Href = Href.split("/");
      const documentID = Href[Href.length - 1];
      return { status: response?.status, documentID };
    } else {
      return { status: response?.status, documentID: null };
    }
  } catch (error) {
    console.log("Erro no getFolderByPath");
    console.error(error);
  }
};

/**
 * @async
 * @function updateAttributes
 * @description UPDATE ATTRIBUTES ON DOCUMENT USING SHEET DATA
 * @param {Object} attributes - The attributes to be updated on the document.
 * @param {string} documentID - The ID of the document in the content library management (CLM) system.
 * @param {string} token - Authentication token.
 * @returns {Promise<void>} - Resolves after updating the attributes on the document.
 * @throws {Error} - Throws an error if there is an issue with the fetch request.
 * @example await updateAttributes(objectAttributes, 'document123', 'token123');
 */
export const updateAttributes = async (attributes, documentID, token) => {
  const options = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(attributes),
  };
  const url = `https://api${endPointInstance}.springcm.com/v2/${accountID}/documents/${documentID}`;

  try {
    const response = await fetch(url, options);
    console.log(
      "Response status code (upload metadata document): " + response.status
    );
  } catch (error) {
    console.error(error);
    console.log("Failed to update metadata document");
  }
};

/**
 * @async
 * @function uploadDocuments
 * @description FUNCTION TO UPLOAD DOCUMENTS
 * @param {string} nameDocument - Name of the document to be uploaded.
 * @param {Buffer} document - Document content as a Buffer.
 * @param {string} accountID - Account ID for authentication.
 * @param {string} token - Authentication token.
 * @param {string} folderID - ID of the folder where the document will be uploaded.
 * @param {string} filePath - File path of the document.
 * @returns {string} - Document ID if the upload is successful.
 * @throws {errors} - Throws an error if the maximum number of upload retries is reached.
 * @example uploadDocuments('arquivo1.pdf', bufferData, '12345', 'token123', 'folder789', './src/Files/clientes/123/arquivo1.pdf');
 */
export const uploadDocuments = async (
  nameDocument,
  document,
  accountID,
  token,
  folderID,
  filePath
) => {
  const url = `https://apiupload${endPointInstance}.springcm.com/v2/${accountID}/folders/${folderID}/documents?name=${encodeURIComponent(
    nameDocument
  )}`;
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Disposition": `form-data; filename="${nameDocument}"`,
      "Content-Transfer-Encoding": "base64",
    },
    signal: controller.signal,
    body: document.toString("base64"),
  };

  try {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch(url, options);
        const { Href } = await response.json();
        const hrefUrlDoc = Href.split("/");
        const documentID = hrefUrlDoc[hrefUrlDoc.length - 1];

        if (response.status === 201) {
          logs("processedArchives.txt", `Processed: ${nameDocument}`);
          console.log(
            `Upload do arquivo: ${nameDocument} realizado com sucesso!, tentativa N°: ${retries}`
          );
          return documentID;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        retries++;
        console.log(
          `Upload do arquivo: ${filePath} Falhou, tentativa N°: ${retries}`
        );

        if (retries === MAX_RETRIES) {
          throw new Error("Número máximo de retrys de upload atingido");
        }
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    error.name === "AbortError"
      ? console.log("A solicitação excedeu o tempo limite.")
      : console.error("Erro na solicitação:", error);
  } finally {
    clearTimeout(timeoutId);
  }
};
