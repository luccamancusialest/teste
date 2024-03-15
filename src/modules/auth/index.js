import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { logs } from "../utils/index.js";
import dotenv from "dotenv";
dotenv.config();

import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 3000;

// MAX TIME OF RETURN RESPONSE AT REQUESTS
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000);

const tokenMake = process.env.TOKEN_MAKE;
/**
 * @async
 * @function getSecretGcp
 * @description GET SECRET AT THE PROJECT ON GCP
 * @param {string} name - Name or ID of the secret to retrieve from Google Cloud Secret Manager.
 * @returns {Promise<string>} - The secret's payload data as a UTF-8 string.
 * @throws {Error} - Throws an error if there is an issue accessing the secret.
 * @example const secretValue = await getSecretGcp('my-secret-name');
 */
export const getSecretGcp = async (name) => {
  const client = new SecretManagerServiceClient();
  try {
    const [acessResponse] = await client.accessSecretVersion({
      name: name,
    });

    const responsePayload = acessResponse.payload?.data?.toString("utf8");
    return responsePayload;
  } catch (e) {
    console.error(e);
  }
};

/**
 * @async
 * @function getAccessToken
 * @description GET ACCESS TOKEN OF DATA STORE AT MAKE.COM
 * @param {string} client - Client name for which the access token is being retrieved.
 * @returns {Promise<string>} - The access token associated with the specified client.
 * @throws {Error} - Throws an error if there is an issue retrieving the access token.
 * @example const accessToken = await getAccessToken('my-client-name');
 *
 */
export const getAccessToken = async (client) => {
  const url = "https://us1.make.com/api/v1/data-stores/23221/data";

  const options = {
    method: "GET",
    headers: {
      Authorization: `Token ${tokenMake}`,
    },
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`A request falhou: ${response.status}`);
    const { records } = await response.json();

    const access = await records.find(
      (record) => record.data.Cliente === client
    );

    return access.data["Access token"];
  } catch (error) {
    logs("makeLogs.txt", error);
    console.error(error);
  } finally {
    clearTimeout(timeoutId);
  }
};
