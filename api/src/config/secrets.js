const { SecretsManagerClient, GetSecretValueCommand } =
  require("@aws-sdk/client-secrets-manager");

async function loadSecrets() {
  if (!process.env.AWS_SECRET_NAME) {
    // fallback
    return {
      db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      }
    };
  }

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION
  });

  const command = new GetSecretValueCommand({
    SecretId: process.env.AWS_SECRET_NAME
  });

  const response = await client.send(command);
  const secret = JSON.parse(response.SecretString);

  return {
    db: {
      host: secret.DB_HOST,
      port: secret.DB_PORT,
      user: secret.DB_USER,
      password: secret.DB_PASSWORD,
      database: secret.DB_NAME
    }
  };
}

module.exports = { loadSecrets };