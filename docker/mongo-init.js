// MongoDB initialization script - creates the application user from env vars.
// This script runs only on first startup when the data volume is empty
// NOTE: root user is created automatically by Mongo image from MONGO_INITDB_ROOT_USERNAME/PASSWORD

const appDatabase = process.env.MONGO_APP_DATABASE || 'formai';
const appUsername = process.env.MONGO_APP_USERNAME || 'formai_app';
const appPassword = process.env.MONGO_APP_PASSWORD;
const verificationCollection = 'init_verification';

if (!appPassword) {
  throw new Error('MONGO_APP_PASSWORD is required for mongo-init.js');
}

db = db.getSiblingDB(appDatabase);

const existingUser = db.system.users.findOne({ user: appUsername });
if (!existingUser) {
  db.createUser({
    user: appUsername,
    pwd: appPassword,
    roles: [
      { role: 'readWrite', db: appDatabase }
    ]
  });
  print(`Application user "${appUsername}" created for ${appDatabase} database`);
} else {
  print(`Application user "${appUsername}" already exists in ${appDatabase}`);
}

// Create a test collection to verify write access
if (!db.getCollectionNames().includes(verificationCollection)) {
  db.createCollection(verificationCollection);
}

print(`${appDatabase} database initialized and ready`);
